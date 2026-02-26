import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './JobDetailPage.module.css';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getJob, updateJobStatus } from '../../api';
import type { JobDetail, JobStatus, WebSocketMessage } from '../../types';

// Statuses an operator can manually set in the UI
const MANUAL_STATUSES: JobStatus[] = ['paused', 'failed'];

function formatDatetime(iso: string | null): string {

	if ( !iso ) return '-';

	return new Date(iso).toLocaleString([], {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});

}

// Event type icons
const EVENT_ICON: Record<string, string> = {
	status_change: '◈',
	job_assigned: '→',
	job_started: '▶',
	job_completed: '✓',
	job_failed: '✗',
	job_requeued: '↺',
};

// Renders a filled block bar for 1-5 complexity
function ComplexityBar({ value }: { value: number }) {
	return (
		<span className={styles.complexityBar}>
			{Array.from({ length: 5 }, (_, i) => (
				<span key={i} className={`${styles.block} ${i < value ? styles.blockFilled : ''}`} />
			))}
		</span>
	);
}

export function JobDetailPage() {

	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [job, setJob] = useState<JobDetail | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [updating, setUpdating] = useState<boolean>(false);

	async function fetchJob() {

		if ( !id ) return;

		setLoading(true);
		setError(null);

		try {

			const data = await getJob(parseInt(id, 10));
			setJob(data);

		} catch (err) {

			setError(err instanceof Error ? err.message : 'Failed to load job');

		} finally {

			setLoading(false);

		}

	}

	// Fetch on page load
	useEffect(() => {
		fetchJob();
	}, [id]);

	// Re-fetch if a WebSocket message arrives that concerns this job
	const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {

		if ( message.type === 'connected' ) return;

		if ( 'jobId' in message && message.jobId === parseInt(id ?? '', 10)) {

			fetchJob();

		}

	}, [id]);

	useWebSocket(handleWebSocketMessage);

	// Job status manual override (pause/force fail)
	async function handleStatusUpdate(newStatus: JobStatus) {

		if ( !job ) return;

		setUpdating(true);

		try {

			await updateJobStatus(job.id, newStatus);
			await fetchJob();

		} catch (err) {

			alert(err instanceof Error ? err.message : 'Failed to update status' );

		} finally {

			setUpdating(false);

		}

	}

	if ( loading ) return (
		<div className={styles.page}>
			<p className={styles.loadingMsg}>Loading job...</p>
		</div>
	);

	if ( error ) return (
		<div className={styles.page}>
			<p className={styles.errorMsg}>{error}</p>
		</div>
	);

	if ( !job ) return null;

	const isActive = ['queued', 'assigned', 'running'].includes(job.status);

	return (
		<div className={styles.page}>

			{/* Top nav */}
			<header className={styles.header}>
				<button 
					className={styles.backBtn}
					onClick={() => navigate('/')}
				>
					← Dashboard
				</button>
				<span className={styles.breadcrumb}>
					Job <span className={styles.breadcrumbId}>#{job.id}</span>
				</span>
			</header>

			<main className={styles.main}>

				{/* Details */}
				<aside className={styles.detailPanel}>

					<div className={styles.jobTitle}>{job.name}</div>

					<div className={styles.jobStatus}>
						<StatusBadge status={job.status} />
						{job.retries > 0 && (
							<span className={styles.retriesNote}>
								↺ {job.retries} retr{job.retries === 1 ? 'y' : 'ies'}
							</span>
						)}
					</div>

					{/* Key-value detail grid */}
					<dl className={styles.detail}>

						<dt>Material</dt>
						<dd className={styles.mono}>{job.material}</dd>

						<dt>Complexity</dt>
						<dd className={styles.mono}>
							<ComplexityBar value={job.complexity} /> <span className={styles.complexityNum}>{job.complexity}/5</span>
						</dd>

						<dt>Requires</dt>
						<dd className={styles.mono}>{job.required_machine_type}</dd>

						<dt>Assigned to</dt>
						<dd className={styles.mono}>{job.machine_name ?? <span className={styles.dimmed}>-</span>}</dd>

						<dt>Priority</dt>
						<dd className={job.priority > 0 ? styles.priorityHigh : styles.mono}>{job.priority}</dd>

						<dt>Est. runtime</dt>
						<dd className={styles.mono}>{job.estimated_runtime != null ? `${job.estimated_runtime}s` : '-'}</dd>

						<dt>Created</dt>
						<dd className={styles.mono}>{formatDatetime(job.created_at)}</dd>

						<dt>Started</dt>
						<dd className={styles.mono}>{formatDatetime(job.started_at)}</dd>

						<dt>Completed</dt>
						<dd className={styles.mono}>{formatDatetime(job.completed_at)}</dd>

					</dl>

					{/* Manual status controls (only for active jobs) */}
					{isActive && (
						<div className={styles.controls}>
							<div className={styles.controlsLabel}>Override Status</div>
							<div className={styles.controlBtns}>
								{MANUAL_STATUSES.map(s => (
									<button
										key={s}
										className={`${styles.controlBtn} ${styles[`control_${s}`]}`}
										onClick={() => handleStatusUpdate(s)}
										disabled={updating || job.status === s}
									>
										{s === 'paused' ? 'Pause' : 'Force Fail'}
									</button>
								))}
							</div>
						</div>
					)}

				</aside>

				{/* Event history */}
				<section className={styles.eventsPanel}>

					<div className={styles.panelHeader}>
						<h2 className={styles.panelTitle}>Event History</h2>
						<span className={styles.panelCount}>{job.events.length}</span>
					</div>

					{job.events.length === 0 ? (

						<p className={styles.timeline}>No events yet.</p>

					) : (

						<ol className={styles.timeline}>
							{[...job.events].reverse().map((event, index) => (
								<li key={event.id} className={`${styles.timelineItem} ${index === 0 ? styles.timelineLatest : ''}`}>
									<span className={styles.timelineIcon}>
										{EVENT_ICON[event.type] ?? '•'}
									</span>
									<div className={styles.timelineContent}>
										<span className={styles.timelineType}>{event.type.replace(/_/g, ' ')}</span>
										{event.message && (
											<span className={styles.timelineMsg}>{event.message}</span>
										)}
										<span className={styles.timelineTime}>{formatDatetime(event.timestamp)}</span>
									</div>
								</li>
							))}
						</ol>

					)}

				</section>

			</main>

		</div>
	);

}