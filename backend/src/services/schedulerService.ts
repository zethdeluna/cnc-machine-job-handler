import { pool }  from '../db';
import { redisPublisher, UPDATES_CHANNEL } from '../db/redis';

/******** Types ********/

interface Job {
	id: number;
	name: string;
	status: string;
	required_machine_type: string;
	assigned_machine_id: number | null;
	estimated_runtime: number | null;
	priority: number;
	retries: number;
	complexity: number;
}

interface Machine {
	id: number;
	name: string;
	type: string;
	status: string;
}

/******** Pub/Sub helper ********/

export async function publishUpdate(payload: object): Promise<void> {
	await redisPublisher.publish(UPDATES_CHANNEL, JSON.stringify(payload));
}

/******** DB helpers ********/

export async function getJobById(jobId: number): Promise<Job | null> {

	const result = await pool.query(
		`SELECT * FROM jobs WHERE id = $1`,
		[jobId]
	);

	return result.rows[0] ?? null;

}

export async function findIdleMachine(type: string, client: any): Promise<Machine | null> {
	// Returns the first idle machine whos type matches - FOR UPDATE locks the row
	// so two scheduler instances can't grab the same machine simultaneously.

	const result = await client.query(
		`
		SELECT * FROM machines
		WHERE type = $1 AND status = 'idle'
		ORDER BY id
		LIMIT 1
		FOR UPDATE SKIP LOCKED
		`,
		[type]
	);

	return result.rows[0] ?? null;

}

/******** Job lifecycle (all wrapped in transactions) ********/

export async function assignJob(jobId: number): Promise<{ machine: Machine; job: Job } | null> {

	const client = await pool.connect();

	try {

		await client.query('BEGIN');

		// Job
		const job = (await client.query(
			`SELECT * FROM jobs WHERE id = $1 FOR UPDATE`,
			[jobId]
		)).rows[0];

		if ( !job || job.status !== 'queued' ) {
			await client.query('ROLLBACK');
			return null;
		}

		// Machine
		const machine = await findIdleMachine(job.required_machine_type, client);

		if ( !machine ) {
			await client.query('ROLLBACK');
			return null;
		}

		// Updates
		await client.query(
			`
			UPDATE jobs
			SET status = 'assigned', assigned_machine_id = $1
			WHERE id = $2
			`,
			[machine.id, jobId]
		);

		await client.query(
			`
			UPDATE machines SET status = 'running' WHERE id = $1
			`,
			[machine.id]
		);

		await client.query(
			`
			INSERT INTO events (type, machine_id, job_id, message)
			VALUES ('job_assigned', $1, $2, $3)
			`,
			[machine.id, jobId, `Job "${job.name}" assigned to ${machine.name}`]
		);

		await client.query('COMMIT');

		await publishUpdate({ type: 'job_assigned', jobId, machineId: machine.id, machineName: machine.name });

		return { machine, job };

	} catch (err) {

		await client.query('ROLLBACK');
		throw err;

	} finally {

		client.release();

	}

}

export async function startJob(jobId: number, machineId: number): Promise<void> {

	const client = await pool.connect();

	try {

		await client.query('BEGIN');

		const job = (await client.query(
			`SELECT name FROM jobs WHERE id = $1`,
			[jobId]
		)).rows[0];

		await client.query(
			`
			UPDATE jobs SET status = 'running', started_at = NOW() WHERE id = $1
			`,
			[jobId]
		);

		await client.query(
			`
			INSERT INTO events (type, machine_id, job_id, message)
			VALUES ('job_started', $1, $2, $3)
			`,
			[machineId, jobId, `Job "${job.name}" started on machine ${machineId}`]
		);

		await client.query('COMMIT');

		await publishUpdate({ type: 'job_started', jobId, machineId });

	} catch (err) {

		await client.query('ROLLBACK');
		throw err;

	} finally {

		client.release();

	}

}

export async function completeJob(jobId: number, machineId: number): Promise<void> {

	const client = await pool.connect();

	try {

		await client.query('BEGIN');

		const job = (await client.query(
			`
			SELECT name FROM jobs WHERE id = $1
			`,
			[jobId]
		)).rows[0];

		await client.query(
			`
			UPDATE jobs
			SET status = 'completed', completed_at = NOW()
			WHERE id = $1
			`,
			[jobId]
		);

		await client.query(
			`
			UPDATE machines SET status = 'idle' WHERE id = $1
			`,
			[machineId]
		);

		await client.query(
			`
			INSERT INTO events (type, machine_id, job_id, message)
			VALUES ('job_completed', $1, $2, $3)
			`,
			[machineId, jobId, `Job "${job.name}" completed successfully`]
		);

		await client.query('COMMIT');

		await publishUpdate({ type: 'job_completed', jobId, machineId });

	} catch (err) {

		await client.query('ROLLBACK');
		throw err;

	} finally {

		client.release();

	}

}

const MAX_RETRIES = 2;

export async function failJob(jobId: number, machineId: number, reason: string): Promise<{ willRetry: boolean }> {

	const client = await pool.connect();

	try {

		await client.query('BEGIN');

		const job = (await client.query(
			`
			SELECT name, retries FROM jobs WHERE id = $1
			`,
			[jobId]
		)).rows[0];

		const willRetry = job.retries < MAX_RETRIES;
		const newStatus = willRetry ? 'queued' : 'failed';

		await client.query(
			`
			UPDATE jobs
			SET status = $1,
				retries = retries + 1,
				assigned_machine_id = CASE WHEN $2 THEN NULL ELSE assigned_machine_id END
			WHERE id = $3
			`,
			[newStatus, willRetry, jobId]
		);

		await client.query(
			`
			UPDATE machines SET status = 'idle' WHERE id = $1
			`,
			[machineId]
		);

		await client.query(
			`
			INSERT INTO events (type, machine_id, job_id, message)
			VALUES ('job_failed', $1, $2, $3)
			`,
			[machineId, jobId, willRetry ? `Job "${job.name}" failed (attempt ${job.retries + 1}/${MAX_RETRIES + 1}): ${reason}. Re-queuing...` : `Job "${job.name}" permanently failed after ${MAX_RETRIES + 1} attempts: ${reason}`]
		);

		await client.query('COMMIT');

		await publishUpdate({ type: willRetry ? 'job_requeued' : 'job_failed', jobId, machineId, reason });

		return { willRetry };

	} catch (err) {

		await client.query('ROLLBACK');
		throw err;

	} finally {

		client.release();

	}

}