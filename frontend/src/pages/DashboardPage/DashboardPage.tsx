import { useState, useCallback } from 'react';
import styles from './DashboardPage.module.css';
import { useMachines } from '../../hooks/useMachines';
import { useJobs } from '../../hooks/useJobs';
import { useWebSocket } from '../../hooks/useWebSocket';
import { MachineCard } from '../../components/MachineCard/MachineCard';
import { JobRow } from '../../components/JobRow/JobRow';
import { JobForm } from '../../components/JobForm/JobForm';
import type { JobStatus } from '../../types';
import type { WebSocketMessage } from '../../types';

// Status dropdown options
const STATUS_FILTERS: { label: string; value: JobStatus | '' }[] = [
	{ label: 'All Jobs', value: '' },
	{ label: 'Queued', value: 'queued'},
	{ label: 'Assigned', value: 'assigned'},
	{ label: 'Running', value: 'running'},
	{ label: 'Paused', value: 'paused'},
	{ label: 'Completed', value: 'completed'},
	{ label: 'Failed', value: 'failed'}
];

export function DashboardPage() {

	const [showForm, setShowForm] = useState<boolean>(false);
	const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');

	const {
		machines,
		loading: machinesLoading,
		error: machinesError,
		refresh: refreshMachines
	} = useMachines();

	const {
		jobs,
		loading: jobsLoading,
		error: jobsError,
		refresh: refreshJobs
	} = useJobs( statusFilter ? { status: statusFilter } : {} );

	// Handle WebSocket messages coming from the backend
	const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {

		if ( message.type === 'connected' ) return;

		refreshMachines();
		refreshJobs();

	}, [refreshMachines, refreshJobs]);

	useWebSocket(handleWebSocketMessage);

	// Close modal & refresh jobs after a new job is created
	const handleJobCreated = () => {
		setShowForm(false);
		refreshJobs();
	}

	// Count machines by status for the summary row
	const machineStats = {
		total: machines.length,
		running: machines.filter(m => m.status === 'running').length,
		idle: machines.filter(m => m.status === 'idle').length
	};

	return (
		<div className={styles.page}>

			{/* Top Header */}
			<header className={styles.header}>

				<div className={styles.brand}>
					<span className={styles.brandIcon}>⬡</span>
					<span className={styles.brandName}>CNC Handler</span>
				</div>

				{/* Live machine status summary */}
				<div className={styles.machineStats}>
					<span className={styles.stat}>
						<span className={styles.statDot} data-status="running" />
						{machineStats.running} running
					</span>
					<span className={styles.statDivider}>/</span>
					<span className={styles.stat}>
						<span className={styles.statDot} data-status="idle" />
						{machineStats.idle} idle
					</span>
					<span className={styles.statDivider}>/</span>
					<span className={styles.stat}>
						{machineStats.total} total
					</span>
				</div>

				{/* New Job button */}
				<button
					className={styles.newJobBtn}
					onClick={() => setShowForm(true)}
				>
					+ New Job
				</button>

			</header>

			{/* Main */}
			<main className={styles.main}>

				{/* Left Panel - Machine Fleet */}
				<section className={styles.machinesPanel}>

					<div className={styles.panelHeader}>
						<h2 className={styles.panelTitle}>Fleet</h2>
						<span className={styles.panelCount}>{machines.length}</span>
					</div>

					{machinesLoading && (
						<p className={styles.loadingMsg}>Loading machines...</p>
					)}

					{machinesError && (
						<p className={styles.errorMsg}>{machinesError}</p>
					)}

					{!machinesLoading && !machinesError && (
						<div className={styles.machineGrid}>
							{machines.map(machine => (
								<MachineCard key={machine.id} machine={machine} />
							))}
						</div>
					)}

				</section>

				{/* Right Panel - Job Queue */}
				<section className={styles.jobsPanel}>
					<div className={styles.panelHeader}>

						<h2 className={styles.panelTitle}>Job Queue</h2>

						{/* Status Filter */}
						<select 
							className={styles.filterSelect}
							value={statusFilter}
							onChange={e => setStatusFilter(e.target.value as JobStatus | '')}
						>
							{STATUS_FILTERS.map(f => (
								<option key={f.value} value={f.value}>{f.label}</option>
							))}
						</select>

						<span className={styles.panelCount}>{jobs.length}</span>

					</div>

					{jobsLoading && (
						<p className={styles.loadingMsg}>Loading jobs...</p>
					)}

					{jobsError && (
						<p className={styles.errorMsg}>{jobsError}</p>
					)}

					{!jobsLoading && !jobsError && (
						jobs.length === 0 ? (
							<div className={styles.emptyState}>
								<span className={styles.emptyIcon}>◫</span>
								<p>No jobs found.</p>
								<button 
									className={styles.emptyCreateBtn}
									onClick={() => setShowForm(true)}
								>
									Create the first job +
								</button>
							</div>
						) : (
							<div className={styles.tableWrapper}>
								<table className={styles.table}>
									<thead>
										<tr>
											<th>ID</th>
											<th>Name</th>
											<th>Material</th>
											<th>Complexity</th>
											<th>Type</th>
											<th>Priority</th>
											<th>Runtime</th>
											<th>Status</th>
											<th>Created</th>
										</tr>
									</thead>
									<tbody>
										{jobs.map(job => (
											<JobRow key={job.id} job={job} />
										))}
									</tbody>
								</table>
							</div>
						)
					)}

				</section>

			</main>

			{/* Job Modal */}
			{showForm && (
				<JobForm 
					onCreated={handleJobCreated}
					onCancel={() => setShowForm(false)}
				/>
			)}

		</div>
	);

}