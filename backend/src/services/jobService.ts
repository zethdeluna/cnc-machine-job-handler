import { pool } from '../db';

export async function getAllJobs(filters: { status?: string; machineId?: number }) {

	const conditions: string[] = [];
	const values: (string | number)[] = [];

	if ( filters.status ) {
		values.push(filters.status);
		conditions.push(`j.status = $${values.length}`);
	}

	if ( filters.machineId ) {
		values.push(filters.machineId);
		conditions.push(`j.machine_id = $${values.length}`);
	}

	const whereClause = conditions.length > 0
		? `WHERE ${conditions.join(' AND ')}`
		: ''
	;

	const result = await pool.query(
		`
		SELECT
			j.*,
			m.name AS machine_name,
			m.type AS machine_type
		FROM jobs j
		LEFT JOIN machines m ON m.id = j.assigned_machine_id
		${whereClause}
		ORDER BY j.created_at DESC
		`, 
		values
	);

	return result.rows;

}

export async function getJobById(id: number) {

	const jobResult = await pool.query(
		`
		SELECT j.*, m.name AS machine_name
		FROM jobs j
		LEFT JOIN machines m ON m.id = j.assigned_machine_id
		WHERE j.id = $1
		`,
		[id]
	);

	if ( jobResult.rows.length === 0 ) return null;

	const eventsResult = await pool.query(
		`SELECT * FROM events WHERE job_id = $1 ORDER BY timestamp ASC`,
		[id]
	);

	return {
		...jobResult.rows[0],
		events: eventsResult.rows
	}

}

export async function createJob(data: {
	assignedMachineId: number;
	name: string;
	material: string;
	complexity: number;
	requiredMachineType: string;
	priority?: number;
	estimatedRuntime?: number;
}) {

	// Use a db transaction: both the job insert and the first event must succeed together.
	// If one fails, the other rolls back. You never want a job with no creation event.

	const client = await pool.connect();

	try {

		await client.query('BEGIN');

		const jobResult = await client.query(
			`
			INSERT INTO jobs (assigned_machine_id, name, material, complexity, required_machine_type, priority, estimated_runtime, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued')
			RETURNING *
			`,
			[data.assignedMachineId, data.name, data.material, data.complexity, data.requiredMachineType, data.priority ?? 0, data.estimatedRuntime ?? null]
		);

		const job = jobResult.rows[0];

		await client.query(
			`
			INSERT INTO events (job_id, type, message)
			VALUES ($1, 'status_change', $2)
			`,
			[job.id, `Job created with status: queued`]
		);

		await client.query('COMMIT');
		return job;

	} catch (err) {

		await client.query('ROLLBACK');
		throw err;

	} finally {

		client.release(); // always return the connection to the pool

	}

}

export async function updateJobStatus(id: number, status: string) {

	const validStatuses = ['queued', 'assigned', 'running', 'paused', 'completed', 'failed'];

	if ( !validStatuses.includes(status) ) {
		throw new Error(`Invalid status: ${status}`);
	}

	const client = await pool.connect();

	try {

		await client.query('BEGIN');

		const result = await client.query(
			`
			UPDATE jobs SET status = $1
			WHERE id = $2 RETURNING *
			`,
			[status, id]
		);

		if ( result.rows.length === 0 ) {
			await client.query('ROLLBACK');
			return null;
		}

		await client.query(
			`
			INSERT INTO events (job_id, type, message)
			VALUES ($1, 'status_change', $2)
			`,
			[id, `Status changed to: ${status}`]
		);

		await client.query('COMMIT');
		return result.rows[0];

	} catch (err) {

		await client.query('ROLLBACK');
		throw err;

	} finally {

		client.release();

	}

}