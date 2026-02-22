import { Request, Response } from 'express';
import * as jobService from '../services/jobService';

export async function listJobs(req: Request, res: Response) {

	try {

		const filters = {
			status: req.query.status as string | undefined,
			machineId: req.query.machind_id ? parseInt(req.query.machine_id as string, 10) : undefined
		};

		const jobs = await jobService.getAllJobs(filters);
		res.json(jobs);

	} catch (err) {

		console.error('listJobs error: ', err);
		res.status(500).json({ error: 'Failed to fetch jobs' });

	}

}

export async function getJob(req: Request, res: Response) {

	try {
		
		const id = parseInt(req.params.id as string, 10);
		if ( isNaN(id) ) return res.status(400).json({ error: 'Invalid job ID' });

		const job = await jobService.getJobById(id);
		if ( !job ) return res.status(400).json({ error: 'Job not found' });

		res.json(job);

	} catch (err) {

		console.error('getJob error: ', err);
		res.status(500).json({ error: 'Failed to fetch job' });

	}

}

export async function createJob(req: Request, res: Response) {

	try {

		const { assigned_machine_id, name, material, complexity, required_machine_type, priority, estimated_runtime } = req.body;

		if ( !name || !material || !complexity || !required_machine_type ) {
			return res.status(400).json({ error: 'assigned_machine_id, name, material, complexity, and required_machine_type are required' });
		}

		const job = await jobService.createJob({
			assignedMachineId: assigned_machine_id,
			name,
			material,
			complexity,
			requiredMachineType: required_machine_type,
			priority,
			estimatedRuntime: estimated_runtime
		});

		res.status(201).json(job); // 201 = "Created"

	} catch (err) {

		console.error('createJob error: ', err);
		res.status(500).json({ error: 'Failed to create job' });

	}

}

export async function updateJobStatus(req: Request, res: Response) {

	try {

		const id = parseInt(req.params.id as string, 10);
		if ( isNaN(id) ) return res.status(400).json({ error: 'Invalid job ID' });

		const { status } = req.body;
		if ( !status ) return res.status(400).json({ error: 'status is required' });

		const job = await jobService.updateJobStatus(id, status);
		if ( !job ) return res.status(404).json({ error: 'Job not found' });

		res.json(job);

	} catch (err: any) {

		if ( err.message?.startsWith('Invalid status')) {
			return res.status(400).json({ error: err.message });
		}

		console.error('updateJobStatus error: ', err);
		res.status(500).json({ error: 'Failed to update job status' });

	}

}