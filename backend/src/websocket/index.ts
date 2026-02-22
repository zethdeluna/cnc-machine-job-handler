import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { createClient } from 'redis';
import { config } from '../config';
import { UPDATES_CHANNEL } from '../db/redis'; 

// This Set holds every browser client currently connected.
const clients = new Set<WebSocket>();

export async function initWebSocket(server: Server): Promise<void> {

	// Attach the WebSocket server to the existing HTTP server.
	const wss = new WebSocketServer({ server });

	// Redis subscriber
	const redisSubscriber = createClient({ url: config.redisUrl });

	redisSubscriber.on('error', (err) => {
		console.error('[WebSocket] Redis subscriber error: ', err);
	});

	await redisSubscriber.connect();

	await redisSubscriber.subscribe(UPDATES_CHANNEL, (message) => {
		broadcast(message);
	});

	console.log(`[WebSocket] Subscribed to Redis channel: ${UPDATES_CHANNEL}`);

	// Connection handler - opens every time a browser opens a WebSocket connection
	wss.on('connection', (ws) => {
		
		clients.add(ws);
		console.log(`[WebSocket] Client connected. Total: ${clients.size}`);

		// Send a welcome message so the client knows the connection is live
		ws.send(JSON.stringify({ type: 'connected', message: 'Connected to CNC Job Handler' }));

		// When the client disconnects (tan closed, network drop, etc.), remove it from the Set.
		ws.on('close', () => {
			clients.delete(ws);
			console.log(`[WebSocket] Client disconnected. Total: ${clients.size}`);
		});

		// Log errors but don't crash (one bad client shouldn't affect others)
		ws.on('error', (err) => {
			console.error('[WebSocket] Client error: ', err);
			clients.delete(ws);
		});

		console.log('[WebSocket] Server initialized');

	});

}


// Sends a message string to every connected client.
function broadcast(message: string): void {

	for ( const client of clients ) {
		if ( client.readyState === WebSocket.OPEN ) {
			client.send(message);
		}
	}

}