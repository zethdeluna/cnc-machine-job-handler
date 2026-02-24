import { useNavigate } from "react-router";
import styles from './JobRow.module.css';
import { StatusBadge } from "../StatusBadge/StatusBadge";
import type { Job } from "../../types";

interface JobRowProps {
	job: Job;
}

/**
 * Renders a complexity score as filled/empty blocks
 */
function ComplexityBar({ value }: {value: number }) {
	return (
		<span className={styles.complexity}>
			{Array.from({ length: 5 }, (_, i) => (
				<span
					key={i}
					className={`${styles.complexityBlock} ${i < value ? styles.complexityFilled : ''}`}
				/>
			))}
		</span>
	);
}

/**
 * Formats a seconds value into a humna-readable string like "8s" or "2m 30s"
 */
function formatRuntime(seconds: number | null): string {

	if ( seconds === null ) return '-';
	if ( seconds < 60 ) return `${seconds}s`;

	const minutes = Math.floor(seconds / 60);
	const s = seconds % 60;
	
	return s > 0 ? `${minutes}m ${s}s` : `${minutes}m`;

}

/**
 * Formats an ISO timestamp into something compact like "14:32" or "Feb 19"
 */
function formatTime(iso: string | null): string {

	if ( !iso ) return '-';

	const date = new Date(iso);
	const now = new Date();
	const sameDay = date.toDateString() === now.toDateString();

	return sameDay
		? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})
		: date.toLocaleDateString([], { month: 'short', day: 'numeric' })
	;

}

export function JobRow({ job }: JobRowProps) {

	const navigate = useNavigate();

	return (
		<tr
			className={styles.row}
			onClick={() => navigate(`/jobs/${job.id}`)}
			title="Click to view job details"
		>

			{/* Job ID */}
			<td className={styles.id}>
				<span className={styles.idPrefix}>#</span>{job.id}
			</td>

			{/* Job name & Machine assignment */}
			<td className={styles.name}>
				<span className={styles.nameText}>{job.name}</span>
				{job.machine_name && (
					<span className={styles.machineName}>{job.machine_name}</span>
				)}
			</td>

			{/* Material */}
			<td className={styles.material}>{job.material}</td>

			{/* Complexity Bar */}
			<td className={styles.complexityCell}>
				<ComplexityBar value={job.complexity} />
			</td>

			{/* Required machine type */}
			<td className={styles.machineType}>{job.required_machine_type}</td>

			{/* Priority number */}
			<td className={styles.priority}>
				<span className={job.priority > 0 ? styles.priorityHigh : styles.priorityNormal}>
					{job.priority}
				</span>
			</td>

			{/* Estimated runtime */}
			<td className={styles.runtime}>{formatRuntime(job.estimated_runtime)}</td>

			{/* Status badge */}
			<td className={styles.status}>
				<StatusBadge status={job.status} />
				{job.retries > 0 && (
					<span className={styles.retries} title={`Retried ${job.retries}x`}>
						↺${job.retries}
					</span>
				)}
			</td>

			{/* Created timestamp */}
			<td className={styles.time}>{formatTime(job.created_at)}</td>

		</tr>
	);

}