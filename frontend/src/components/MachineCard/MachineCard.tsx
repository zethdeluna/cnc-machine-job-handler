import styles from './MachineCard.module.css';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import type { Machine } from '../../types';

interface MachineCardProps {
	machine: Machine;
}

// Machine type icons - simple text glyphs to keep it dependency-free
const TYPE_ICON: Record<string, string> = {
	mill:  '⬡',
	lathe: '◎',
	drill: '⊕',
};

export function MachineCard({ machine }: MachineCardProps) {

	const icon = TYPE_ICON[machine.type] ?? '◻';
	const jobCount = parseInt(machine.active_jobs, 10);

	return (
		<div className={`${styles.card} ${styles[machine.status]}`}>

			{/* Top row: icon + machine type label */}
			<div className={styles.header}>
				<span className={styles.icon}>{icon}</span>
				<span className={styles.type}>{machine.type}</span>
			</div>

			{/* Machine name */}
			<div className={styles.name}>{machine.name}</div>

			{/* Status badge + active job count */}
			<div className={styles.footer}>
				<StatusBadge status={machine.status} />
				{jobCount > 0 && (
					<span className={styles.jobCount}>
						{jobCount} job{jobCount !== 1 ? 's' : ''}
					</span>
				)}
			</div>

		</div>
	);

}