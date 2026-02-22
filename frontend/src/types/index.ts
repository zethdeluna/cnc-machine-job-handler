// ================================================================================
//
// All components, hooks, and API functions import their types from here.
// 
// These types are derived directly from what the backend actually returns
//(DB schema + JOIN'd columns that the API layer adds on top).
//
// ================================================================================

// --------------------------------------------------------------------------------
//
// MACHINE
//
// Shape returned by GET /api/machines and GET /api/machines/:id
// 
// Ref: getAllMachines() [backend/src/services/machineService.ts]
//
// --------------------------------------------------------------------------------

export type MachineStatus = 'idle' | 'running' | 'maintenance' | 'error';

export interface Machine {
	id: number;
	name: string;
	type: string;
	status: MachineStatus;
	last_maintenance_date: string | null;
	active_jobs: string;
}

export type MachineSingle = Omit<Machine, 'active_jobs'>;

// --------------------------------------------------------------------------------
//
// JOB
// 
// Shape returned by GET /api/jobs
// 
// Ref: getAllJobs() [backend/src/services/jobService.ts]
//
// --------------------------------------------------------------------------------

export type JobStatus = 'queued' | 'assigned' | 'running' | 'paused' | 'completed' | 'failed';

export interface Job {
	id: number;
	name: string;
	material: string;
	complexity: number;
	required_machine_type: string;
	priority: number;
	status: JobStatus;
	retries: number;
	assigned_machine_id: number | null;
	estimated_runtime: number | null;
	started_at: string | null;
	completed_at: string | null;
	created_at: string;
	machine_name: string | null;
	machine_type: string | null;
}

// --------------------------------------------------------------------------------
//
// EVENT
// 
// Mirrors the 'events' table [infra/postgres/init.sql]
//
// --------------------------------------------------------------------------------

export interface Event {
	id: number;
	type: string;
	machine_id: number | null;
	job_id: number | null;
	message: string | null;
	timestamp: string;
}

// --------------------------------------------------------------------------------
//
// JOB DETAIL
// 
// Shape returned by GET /api/jobs/:id
// 
// Ref: getJobById() [backend/src/services/jobService.ts]
//
// --------------------------------------------------------------------------------

export interface JobDetail extends Job {
	events: Event[]
}

// --------------------------------------------------------------------------------
//
// CREATE JOB PAYLOAD
// 
// What we POST to /api/jobs
// 
// Required by the backend: name, material, complexity, required_machine_type.
// Optional: priority (default 0), estimated_runtime.
//
// --------------------------------------------------------------------------------

export interface CreateJobPayload {
	name: string;
	material: string;
	complexity: number;
	required_machine_type: string;
	priority?: number;
	estimated_runtime?: number;
}

// --------------------------------------------------------------------------------
//
// WEBSOCKET MESSAGES
// 
// Every message has a 'type' field. The rest of the payload depends on type.
// These match the exact shapes published by schedulerService.ts and websocket/index.ts
// - they are lightweight event notifications, not full object snapshots.
// The frontend re-fetches data when it receives one.
// 
// Published by websocket/index.ts on connection:
//   { type: 'connected', message: string }
//
// Published by schedulerService.ts via publishUpdate():
//   { type: 'job_assigned',  jobId, machineId, machineName }
//   { type: 'job_started',   jobId, machineId }
//   { type: 'job_completed', jobId, machineId }
//   { type: 'job_requeued',  jobId, machineId, reason }
//   { type: 'job_failed',    jobId, machineId, reason }
//
// --------------------------------------------------------------------------------

export type WebSocketMessageType = 'connected' | 'job_assigned' | 'job_started' | 'job_completed' | 'job_required' | 'job_failed';

interface ConnectedMessage {
	type: 'connected';
	message: string;
}

interface JobAssignedMessage {
	type: 'job_assigned';
	jobId: number;
	machineId: number;
	machineName: string;
}

interface JobStartedMessage {
	type: 'job_started';
	jobId: number;
	machineId: number;
}

interface JobCompletedMessage {
	type: 'job_completed';
	jobId: number;
	machineId: number;
}

// Shared by job_requeued and job_failed
interface JobFailedMessage {
	type: 'job_requeued' | 'job_failed';
	jobId: number;
	machineId: number;
	reason: string;
}

// TypeScript narrows the type automatically when you check 'message.type'
export type WebSocketMessage = ConnectedMessage | JobAssignedMessage | JobStartedMessage | JobCompletedMessage | JobFailedMessage;