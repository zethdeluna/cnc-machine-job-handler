import type {
	Machine,
	MachineSingle,
	Job,
	JobDetail,
	CreateJobPayload
} from '../types';

// --------------------------------------------------------------------------------
// 
// BASE URL
// 
// Vite exposes environment variables prefixed with VITE_ via import.meta.env.
// We fall back to localhost so the app still works if you run 'npm run dev' outside Docker.
// 
// --------------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';


// --------------------------------------------------------------------------------
// 
// SHARED FETCH HELPER
// 
// Every API call goes through this function. It:
//   1. Sends the request
//   2. Throws a descriptive error if the serve returns a non-2xx status
//   3. Parses and returns the JSON body
// 
// Using a generic <T> means callers get back the exact type they expect without
// needing to cast it themselves.
// 
// --------------------------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit): Promise<T> {

	const response = await fetch(`${BASE_URL}${path}`, {
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		},
		...options
	});

	if ( !response.ok ) {
		// Try to pull the error message from the repsonse body.
		// Fall back to HTTP status text.

		let message = response.statusText;

		try {
			const body = await response.json();
			if ( body?.error ) message = body.error;
		} catch {
			// body wasn't JSON - keep the status text
		}
		throw new Error(`API error ${response.status}: ${message}`);
	}

	return response.json() as Promise<T>;

}


// --------------------------------------------------------------------------------
// 
// MACHINES
// 
// --------------------------------------------------------------------------------

/**
 * GET /api/machines
 * 
 * Returns every machine with an 'active_jobs' COUNT
 * 
 * Note: 'active_jobs' comes back as a string from PostgreSQL's COUNT()
 * Use parseInt(machine.active_jobs, 10a) before doing math with it.
 * 
 */
export function getMachines(): Promise<Machine[]> {
	return request<Machine[]>('/api/machines');
}

/**
 * GET /api/machines/:id
 * 
 * Returns a single machine. Does NOT include 'active_jobs'
 * 
 */
export function getMachine(id: number): Promise<MachineSingle> {
	return request<MachineSingle>(`/api/machines/${id}`);
}


// --------------------------------------------------------------------------------
// 
// Jobs
// 
// --------------------------------------------------------------------------------

/**
 * Filters you can pass to getJobs().
 * Both fields are optional - omit them to get every job.
 */
export interface JobFilters {
	status?: Job['status'];
	machine_id?: number;
}

/**
 * GET /api/jobs
 * GET /api/jobs?status=running
 * GET /api/jobs?machine_id=3
 * GET /api/jobs?status=queued&machine_id=2
 * 
 * Builds the query string from whichever filters are provided, then fetches the matching jobs.
 */
export function getJobs(filters: JobFilters = {}): Promise<Job[]> {

	// URLSearchParams handles encoding special characters for us
	const params = new URLSearchParams();

	if ( filters.status ) params.set('status', filters.status);
	if ( filters.machine_id ) params.set('machine_id', String(filters.machine_id));

	const query = params.toString();
	const path = query ? `/api/jobs?${query}` : '/api/jobs';

	return request<Job[]>(path);

}

/**
 * GET /api/jobs/:id
 * 
 * Returns the job plus its full event history in an 'events' array, ordered oldest → newest
 */
export function getJob(id: number): Promise<JobDetail> {
	return request<JobDetail>(`/api/jobs/${id}`);
}

/**
 * POST /api/jobs
 * 
 * Creates a new job. The scheduler picks it up automatically and assigns it to an idle machine.
 * Do NOT pass 'assigned_machine_id' from the frontend.
 * 
 * Required fields: name, material, complexity, required_machine_type
 * Optional fields: priority, estimated_runtime
 */
export function createJob(payload: CreateJobPayload): Promise<Job> {
	return request<Job>('/api/jobs', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

/**
 * PATCH /api/jobs/:id/status
 * 
 * Manually overrides a job's status. Usefule for pausing or force-failing a job from the UI.
 * 
 * Valid statuses: queued, assigned, running, paused, completed, failed
 */
export function updateJobStatus(id: number, status: Job['status']): Promise<Job> {
	return request<Job>(`/api/jobs/${id}/status`, {
		method: 'PATCH',
		body: JSON.stringify({ status })
	});
}