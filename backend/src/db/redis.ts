import { createClient } from 'redis';
import { config } from '../config';

// General-purpose client for commands
export const redisClient = createClient({ url: config.redisUrl });

// Dedicated publisher - once a client subscribes it can't send commands,
// so we keep a separate client exclusively for PUBLISH calls.
export const redisPublisher = createClient({ url: config.redisUrl });

export async function connectRedis(): Promise<void> {

	await redisClient.connect();
	await redisPublisher.connect();
	console.log('[Redis] Connected');

}

// Score = priority. BXPOPMAX returns the highest score first,
// so higher priority numbers are processed before lower ones.
export const JOBS_QUEUE_KEY = 'jobs:queue';
export const UPDATES_CHANNEL = 'cnc:updates';