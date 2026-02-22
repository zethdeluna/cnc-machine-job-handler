import { pool } from '../db';

/**
 * Get every machine, with a count of how many active jobs each has
 */
export async function getAllMachines() {
	
	const result = await pool.query(`
		SELECT
			m.*,
			COUNT(j.id) FILTER (WHERE j.status IN ('queued', 'assigned', 'running')) AS active_jobs
		FROM machines m
		LEFT JOIN jobs j ON j.assigned_machine_id = m.id
		GROUP BY m.id
		ORDER BY m.name
	`);

	return result.rows;

}

export async function getMachineById(id: number) {

	const result = await pool.query(
		'SELECT * FROM machines WHERE id = $1',
		[id]
	);

	return result.rows[0] ?? null;

}