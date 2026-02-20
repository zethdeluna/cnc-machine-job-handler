-- ====================================
-- Machine Job Handler - Initial Schema
-- ====================================

-- Machines table
CREATE TABLE IF NOT EXISTS machines (
	id		SERIAL PRIMARY KEY,
	name	VARCHAR(100)	NOT NULL,
	type	VARCHAR(50)		NOT NULL,
	status	VARCHAR(20)		NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'maintenance', 'error')),
	last_maintenance_date TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
	id						SERIAL PRIMARY KEY,
	name					VARCHAR(100)	NOT NULL,
	material				VARCHAR(50)		NOT NULL,
	complexity				INTEGER			NOT NULL CHECK (complexity BETWEEN 1 AND 5),
	required_machine_type	VARCHAR(50)		NOT NULL,
	priority				INTEGER			NOT NULL DEFAULT 0,
	status					VARCHAR(20)		NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'assigned', 'running', 'completed', 'failed')),
	retries					INTEGER			NOT NULL DEFAULT 0,
	assigned_machine_id		INTEGER REFERENCES machines(id) ON DELETE SET NULL,
	estimated_runtime		INTEGER, -- in seconds
	started_at				TIMESTAMP,
	completed_at			TIMESTAMP,
	created_at				TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
	id				SERIAL PRIMARY KEY,
	type			VARCHAR(50) NOT NULL,
	machine_id		INTEGER REFERENCES machines(id) ON DELETE SET NULL,
	job_id			INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
	message			TEXT,
	timestamp		TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ====================================
-- Seed Data - Initial machine fleet
-- ====================================

INSERT INTO machines (name, type, status, last_maintenance_date) VALUES
	('Mill-01',		'mill',		'idle', NOW()),
	('Mill-02',		'mill',		'idle', NOW()),
	('Lathe-01',	'lathe',	'idle', NOW()),
	('Lathe-02',	'lathe',	'idle', NOW()),
	('Drill-01',	'drill',	'idle', NOW());