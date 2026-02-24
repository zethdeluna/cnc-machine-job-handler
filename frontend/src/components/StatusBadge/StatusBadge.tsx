import styles from './StatusBadge.module.css';
import type { MachineStatus, JobStatus } from '../../types';

type Status = MachineStatus | JobStatus;

interface StatusBadgeProps {
	status: Status;
	variant?: 'dot' | 'badge';
}

// Maps each status string to the CSS class name that colors it
const STATUS_CLASS: Record<Status, string> = {
	idle:			styles.idle,
	running:		styles.running,
	queued:			styles.queued,
	assigned:		styles.assigned,
	paused:			styles.paused,
	completed:		styles.completed,
	failed:			styles.failed,
	maintenance:	styles.maintenance,
	error:			styles.error
};

export function StatusBadge({ status, variant = 'badge' }: StatusBadgeProps) {

	const colorClass = STATUS_CLASS[status] ?? styles.idle;

	if ( variant === 'dot' ) {
		return <span className={`${styles.dot} ${colorClass}`} title={status} />
	}

	return (
		<span className={`${styles.badge} ${colorClass}`}>
			<span className={styles.pip} />
			{status}
		</span>
	);

}