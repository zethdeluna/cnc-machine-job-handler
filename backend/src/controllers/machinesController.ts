import { Request, Response } from 'express';
import * as machineService from  '../services/machineService';

export async function listMachines(req: Request, res: Response) {

	try {
		const machines = await machineService.getAllMachines();
		res.json(machines);
	} catch (err) {
		console.error('listMachines error: ', err);
		res.status(500).json({ error: 'Failed to fetch machines' });
	}

}

export async function getMachine(req: Request, res: Response) {

	try {
		const id = parseInt(req.params.id as string, 10);

		if ( isNaN(id) ) {
			return res.status(400).json({ error: 'Invalid machine ID' });
		}

		const machine = await machineService.getMachineById(id);

		if ( !machine ) {
			return res.status(404).json({ error: 'Machine not found' });
		}

		res.json(machine);

	} catch (err) {

		console.error('getMachine error: ', err);
		res.status(500).json({ error: 'Failed to fetch machine' });

	}

}