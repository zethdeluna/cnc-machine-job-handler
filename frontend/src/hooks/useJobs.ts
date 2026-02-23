import { useState, useEffect, useCallback } from 'react';
import { getJobs } from '../api';
import type { Job } from '../types';
import type { JobFilters } from '../api';

interface UseJobsResult {
	jobs: Job[];
	loading: boolean;
	error: string | null;
	refresh: () => void;
}

/**
 * Fetches the job list from GET /api/jobs, with optional filters.
 * 
 * Filters are applied as query params on the API request:
 * 	useJobs()									→ all jobs
 * 	useJobs({ status: 'running' })				→ only running jobs
 * 	useJobs({ machine_id: 2 })					→ only jobs on machine 2
 * 	useJobs({ status: 'queued', machine_id: 3})	→ obly jobs that are queued on machine 3
 * 
 * Usage:
 * 	const { jobs, loading, error, refresh } = useJobs({ status: 'running' });
 */
export function useJobs(filters: JobFilters = {}): UseJobsResult {

	const [jobs, setJobs] = useState<Job[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const filtersKey = JSON.stringify(filters);

	const fetchJobs = useCallback(async () => {

		setLoading(true);
		setError(null);

		try {

			const parsedFilters: JobFilters = JSON.parse(filtersKey);
			const data = await getJobs(parsedFilters);
			setJobs(data);

		} catch (err) {

			const message = err instanceof Error ? err.message : 'Failed to fetch jobs';
			setError(message);

		} finally {

			setLoading(false);

		}

	}, [filtersKey]);

	useEffect(() => {
		fetchJobs();
	}, [fetchJobs]);

	return { jobs, loading, error, refresh: fetchJobs };

}