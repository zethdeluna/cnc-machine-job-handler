import { useState } from 'react';
import type { SubmitEvent } from 'react';
import styles from './JobForm.module.css';
import { createJob } from '../../api';
import type { CreateJobPayload } from '../../types';

interface JobFormProps {
	onCreated: () => void;
	onCancel: () => void;
}

// Valid machine types
const MACHINE_TYPES = ['mill', 'lathe', 'drill'];

// Valid materials
const MATERIALS = ['aluminum', 'steel', 'titanium', 'brass', 'plastic', 'carbon fiber'];

const INITIAL_FORM: CreateJobPayload = {
	name: '',
	material: '',
	complexity: 1,
	required_machine_type: '',
	priority: 0,
	estimated_runtime: undefined
};

export function JobForm({ onCreated, onCancel }: JobFormProps) {

	const [form, setForm] = useState<CreateJobPayload>(INITIAL_FORM);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Handle fields inputs
	function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {

		const { name, value, type } = e.target;

		setForm(prev => ({
			...prev,
			[name]: type === 'number'
				? (value === '' ? undefined : Number(value))
				: value
		}));

	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		setError(null);
		setSubmitting(true);

		try {

			await createJob(form);
			setForm(INITIAL_FORM);
			onCreated(); // Tell the parent the list needs refreshing

		} catch (err) {

			const message = err instanceof Error ? err.message : 'Failed to create job';
			setError(message);

		} finally {

			setSubmitting(false);

		}

	}

	return (
		<div
			className={styles.overlay}
			onClick={onCancel}
		>
			<div 
				className={styles.modal}
				onClick={e => e.stopPropagation()}
			>
				
				{/* Header */}
				<div className={styles.header}>
					<h2 className={styles.title}>New Job</h2>
					<button className={styles.closeBtn} onClick={onCancel} aria-label="Close">✕</button>
				</div>

				{/* Form */}
				<form
					className={styles.form}
					onSubmit={handleSubmit}
				>
					
					{/* Job name */}
					<div className={styles.field}>
						<label className={styles.label} htmlFor="name">
							Job Name <span className={styles.required}>*</span>
						</label>
						<input 
							id="name"
							name="name"
							type="text"
							className={styles.input}
							value={form.name}
							onChange={handleChange}
							placeholder="e.g. Bracket v2"
							required
							autoFocus
						/>
					</div>

					{/* Two columns: Material + Machine Type */}
					<div className={styles.row}>

						{/* Material */}
						<div className={styles.field}>
							<label className={styles.label} htmlFor="material">
								Material <span className={styles.required}>*</span>
							</label>
							<select
								id="material"
								name="material"
								className={styles.select}
								value={form.material}
								onChange={handleChange}
								required
							>
								<option value="">Select...</option>
								{MATERIALS.map(m => (
									<option key={m} value={m}>{m}</option>
								))}
							</select>
						</div>

						{/* Machine Type */}
						<div className={styles.field}>
							<label className={styles.label} htmlFor="required_machine_type">
								Machine Type <span className={styles.required}>*</span>
							</label>
							<select
								id="required_machine_type"
								name="required_machine_type"
								className={styles.select}
								value={form.required_machine_type}
								onChange={handleChange}
								required
							>
								<option value="">Select...</option>
								{MACHINE_TYPES.map(t => (
									<option key={t} value={t}>{t}</option>
								))}
							</select>
						</div>

					</div>

					{/* Complexity slider */}
					<div className={styles.field}>
						<label className={styles.label} htmlFor="complexity">
							Complexity <span className={styles.required}>*</span>
							<span className={styles.complexityValue}>{form.complexity}/5</span>
						</label>
						<input 
							id="complexity"
							name="complexity"
							type="range"
							min={1}
							max={5}
							step={1}
							className={styles.slider}
							value={form.complexity}
							onChange={handleChange}
						/>
						<div className={styles.sliderLabels}>
							<span>Simple</span>
							<span className={styles.complexityNote}>
								{form.complexity === 5 ? '⚠ 25% failure chance' : ''}
							</span>
							<span>Complex</span>
						</div>
					</div>

					{/* Two columns: Priority + Estimated Runtime */}
					<div className={styles.row}>

						{/* Priority */}
						<div className={styles.field}>
							<label className={styles.label} htmlFor="priority">
								Priority
								<span className={styles.hint}> (0 = lowest)</span>
							</label>
							<input 
								id="priority"
								name="priority"
								type="number"
								min={0}
								max={100}
								className={styles.input}
								value={form.priority ?? ''}
								onChange={handleChange}
								placeholder="0"
							/>
						</div>

						{/* Estimated Runtime */}
						<div className={styles.field}>
							<label className={styles.label} htmlFor="estimated_runtime">
								Est. Runtime
								<span className={styles.hint}> (seconds)</span>
							</label>
							<input 
								id="estimated_runtime"
								name="estimated_runtime"
								type="number"
								min={1}
								max={30}
								className={styles.input}
								value={form.estimated_runtime ?? ''}
								onChange={handleChange}
								placeholder="10"
							/>
						</div>

						{/* Error message */}
						{error && (
							<div className={styles.error}>
								{error}
							</div>
						)}

						{/* Buttons */}
						<div className={styles.actions}>
							<button
								type="button"
								className={styles.cancelBtn}
								onClick={onCancel}
								disabled={submitting}
							>
								Cancel
							</button>
							<button
								type="submit"
								className={styles.submitBtn}
								disabled={submitting}
							>
								{submitting ? 'Creating...' : 'Create Job'}
							</button>
						</div>

					</div>

				</form>

			</div>
		</div>
	);

}