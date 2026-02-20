import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

/**
 * Start Express, connect to Postgres, and expose
 * a "/health" endpoint to confirm both are working
 */

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Database
export const db = new Pool({
	connectionString: process.env.DATABASE_URL
});

// Routes
app.get('/health', async (req, res) => {
	try {
		await db.query('SELECT 1');
		res.json({ status: 'ok', database: 'connected' });
	} catch (error) {
		res.status(500).json({ status: 'error', database: 'disconnected' });
	}
});

// Start
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);

	db.connect()
		.then(client => {
			console.log('Database connected');
			client.release();
		})
		.catch(err => {
			console.error('Database connection failed: ', err.message);
		});
});