import { useState, useEffect, useCallback } from 'react';
import { getMachines } from '../api';
import type { Machine } from '../types';

interface UseMachinesResult {
	machines: Machine[];
	loading: boolean;
	error: string | null;
	refresh: () => void;
}

/**
 * Fetches the full machine fleet from GET /api/machines.
 * 
 * Returns all machines with their live 'active_jobs' count.
 * 
 * Usage:
 * 	const { machines, loading, error, refresh } = useMachines();
 * 
 * 	Call 'refresh()' from a parent component (e.g. when a WebSocket message arrives)
 * 	to re-fetch without mounting/remounting.
 */
export function useMachines(): UseMachinesResult {

	const [machines, setMachines] = useState<Machine[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const fetchMachines = useCallback(async () => {

		setLoading(true);
		setError(null);

		try {

			const data = await getMachines();
			setMachines(data);

		} catch (err) {

			const message = err instanceof Error ? err.message : 'Failed to fetch machines';
			setError(message);

		} finally {

			setLoading(false);

		}

	}, []);

	// Run once on mount
	useEffect(() => {
		fetchMachines();
	}, [fetchMachines]);

	return { machines, loading, error, refresh: fetchMachines };

}