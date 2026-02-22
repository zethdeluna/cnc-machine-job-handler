import { redisClient, JOBS_QUEUE_KEY } from '../db/redis';
import { pool } from '../db';
import { getJobById, assignJob, startJob, completeJob, failJob } from '../services/schedulerService';

/******** Queue helpers ********/

export async function enqueueJob(jobId: number, priority: number): Promise<void> {
	// Score = priority. BZPOPMAX returns highest score first.

	await redisClient.zAdd(JOBS_QUEUE_KEY, { score: priority, value: String(jobId) });
	console.log(`[Scheduler] Enqueued job ${jobId} with priority ${priority}`);

}

/******** Simulate CNC execution ********/

// Cap at 30s so the demo doesn't sit forever; default to 10s when null
const MAX_SIMULATED_RUNTIME_MS = 30_000;
const DEFAULT_RUNTIME_MS = 10_000;

function getRuntimeMs(estimatedSeconds: number | null): number {

	const ms = estimatedSeconds ? estimatedSeconds * 1000 : DEFAULT_RUNTIME_MS;
	return Math.min(ms, MAX_SIMULATED_RUNTIME_MS);

}

function sleep(ms: number): Promise<void> {

	return new Promise((resolve) => setTimeout(resolve, ms));

}

// Complexity 5 jobs have a 25% chance of failre - demonstrates retry logic
function shouldSimulateFailure(job: { complexity?: number}): boolean {

	return job.complexity === 5 && Math.random() < 0.25;

}

/******** Process a single job ********/

async function processJob(jobId: number): Promise<void> {

	console.log(`[Scheduler] Processing job ${jobId}`);

	const job = await getJobById(jobId);

	if ( !job ) {
		console.warn(`[Scheduler] Job ${jobId} not found - skipping`);
		return;
	}

	if ( job.status !== 'queued' ) {
		console.warn(`[Scheduler] Job ${jobId} is '${job.status}', not queued - skipping`);
		return;
	}

	// Assign
	const assigned = await assignJob(jobId);

	if ( !assigned ) {
		// No idle machine of the right type available right now.
		// Re-enqueue at original priority and move on - another job may unblock this.

		console.log(`[Scheduler] No idle machine for job ${jobId} (type: ${job.required_machine_type}) - re-queuing`);
		await enqueueJob(jobId, job.priority);
		await sleep(2000);
		return;

	}

	const { machine } = assigned;
	console.log(`[Scheduler] Job ${jobId} -> assigned to ${machine.name}`);

	// Start
	await startJob(jobId, machine.id);
	console.log(`[Scheduler] Job ${jobId} -> running`);

	// Simulate runtime
	const runtimeMs = getRuntimeMs(job.estimated_runtime);
	console.log(`[Scheduler] Job ${jobId} simulating ${runtimeMs / 1000}s runtime...`);
	await sleep(runtimeMs);

	// Complete or fail
	if ( shouldSimulateFailure(job) ) {

		const { willRetry } = await failJob(jobId, machine.id, 'Simulated machining error on high-complexity part');
		console.log(`[Scheduler] Job ${jobId} -> failed (willRetry: ${willRetry})`);

		if ( willRetry ) {
			await enqueueJob(jobId, job.priority);
		}

	} else {

		await completeJob(jobId, machine.id);
		console.log(`[Scheduler] Job ${jobId} -> completed`);

	}

}

/******** Recovery on startup ********/

async function recoverStaleJobs(): Promise<void> {
	// If the server crashes mid-run, jobs may be stuck in 'assigned'/'running'.
	// Reset them to 'queued' and re-enqueue so they don't get orphaned.

	const client = await pool.connect();

	try {

		await client.query('BEGIN');

		const stale = await client.query(
			`
			UPDATE jobs
			SET status = 'queued',
				assigned_machine_id = NULL,
				started_at = NULL
			WHERE status IN ('assigned', 'running')
			RETURNING id, priority, name
			`
		);

		if ( stale.rowCount && stale.rowCount > 0 ) {

			await client.query(
				`
				UPDATE machines SET status = 'idle'
				WHERE status = 'running'
				`
			);
			console.log(`[Scheduler] Recovered ${stale.rowCount} stale job(s)`);

		}

		await client.query('COMMIT');

		for ( const row of stale.rows ) {
			await enqueueJob(row.id, row.priority);
		}

	} catch (err) {

		await client.query('ROLLBACK');
		throw err;

	} finally {

		client.release();

	}

}

async function recoverQueuedJobs() : Promise<void> {
	// Re-enqueue any jobs that are 'queued' in the DB but not yet in Redis
	// (e.g. after a clean restart)

	const result = await pool.query(
		`
		SELECT id, priority FROM jobs
		WHERE status = 'queued'
		ORDER BY priority DESC
		`
	);

	for ( const row of result.rows ) {
		await enqueueJob(row.id, row.priority);
	}

	if ( result.rowCount && result.rowCount > 0 ) {
		console.log(`[Scheduler] Re-enqueued ${result.rowCount} queued job(s) from DB`);
	}
}

/******** Main loop ********/

export async function startScheduler(): Promise<void> {

	console.log('[Scheduler] Starting...');

	await recoverStaleJobs();
	await recoverQueuedJobs();

	console.log('[Scheduler] Listening for jobs...');

	// BZPOPMAX blocks until a job appears, then returns immediately.
	// The 5-second timeout lets the loop cycle so it isn't truly frozen
	// if the queue is empty - useful for clean shutdown later.

	while ( true ) {

		try {

			const result = await redisClient.bzPopMax(JOBS_QUEUE_KEY, 5);
			if ( !result ) continue; // timeout - queue was empty, loop again

			const jobId = parseInt(result.value, 10);

			// Process without awaiting so the loop can accept the next job
			// while this one simulates its runtime
			processJob(jobId).catch((err) => {
				console.error(`[Scheduler] Unhandled error on job ${jobId}: `, err);
			});

		} catch (err) {

			console.error('[Scheduler] Loop error: ', err);
			await sleep(3000); // back off before retrying on unexpected errors

		}

	}

}