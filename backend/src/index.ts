import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import apiRouter from './routes';
import { connectRedis } from './db/redis';
import { startScheduler } from './workers/scheduler';
import { initWebSocket } from './websocket';
import http from 'http';

/**
 * Start Express, connect to Postgres, and expose
 * a "/health" endpoint to confirm both are working
 */

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use('/api', apiRouter);

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
async function start() {

	const client = await db.connect();
	console.log('Database connected');
	client.release();

	await connectRedis();

	startScheduler();

	const server = http.createServer(app);

	await initWebSocket(server);

	server.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});

}

start().catch(err => {
	console.error('Failed to start server:', err.message);
	process.exit(1);
});