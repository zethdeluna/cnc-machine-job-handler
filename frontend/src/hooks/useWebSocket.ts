import { useEffect, useRef } from 'react';
import type { WebSocketMessage } from '../types';

/**
 * Manages a WebSocket connection to the backend for the lifetime of the component that uses it.
 * 
 * This hook:
 * 	- Opens the connection on mount
 * 	- Parses incoming message as WebSocketMessage and calls 'onMessage'
 * 	- Automatically reconnects after a short delay if the connection drops
 * 	- Closes the connection and cancels any pending reconnect on unmount
 * 
 * This hook does NOT fetch data itself. It just deliveres messages. The caller decides what 
 * to do with them — usually calling 'refresh()' from useMachines or useJobs to pull fresh
 * data from the API.
 * 
 * Usage:
 * 	const { refresh: refreshJobs } = useJobs();
 * 	const { refresh: refreshMachines } = useMachines();
 * 
 * 	useWebSocket((message) = > {
 * 		// Any job state change could affect both the job list and machine statuses
 * 		refreshJobs();
 * 		refreshMachines();
 * 	});
 * 
 * @param onMessage - called every time a message arrives. Wwrap in useCallback in the parent
 * 					  component if you want to avoid re-trigerring the connection on every render.
 */

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';

// Delay before attempting to reconnect after a drop (ms)
const RECONNECT_DELAY_MS = 3000;

export function useWebSocket(onMessage: (message: WebSocketMessage) => void): void {

	const socketRef = useRef<WebSocket | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isMountedRef = useRef<boolean>(true);
	const onMessageRef = useRef(onMessage);

	useEffect(() => {
		onMessageRef.current = onMessage;
	}, [onMessage]);

	useEffect(() => {

		isMountedRef.current = true;

		function connect() {

			if ( !isMountedRef.current ) return;

			console.log('[WebSocket] Connecting...');
			const ws = new WebSocket(WS_URL);
			socketRef.current = ws;

			ws.onopen = () => {
				console.log('[WebSocket] Connected');
			};

			ws.onmessage = (event: MessageEvent) => {

				try {

					const message = JSON.parse(event.data as string) as WebSocketMessage;
					onMessageRef.current(message);

				} catch {

					console.warn('[WebSocket] Failed to parse message: ', event.data);

				}

			};

			ws.onerror = (event) => {

				console.error('[WebSocket] Error: ', event);

			};

			ws.onclose = (event) => {

				console.log(`[WebSocket] Disconnected (code: ${event.code})`);

				if ( !isMountedRef.current ) return;

				console.log(`[WebSocket] Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);

				reconnectTimerRef.current = setTimeout(() => {
					connect();
				}, RECONNECT_DELAY_MS);

			};

		}

		connect();

		// Cleanup
		return() => {

			isMountedRef.current = false;

			if ( reconnectTimerRef.current ) {
				clearTimeout(reconnectTimerRef.current);
			}

			if ( socketRef.current ) {
				socketRef.current.close(1000, 'Component unmounted');
			}

		}

	}, []);

}