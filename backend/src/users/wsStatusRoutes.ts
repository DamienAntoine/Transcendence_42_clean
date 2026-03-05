import { FastifyInstance } from "fastify";
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { onlineStatusManager } from './services/OnlineStatusManager';
import { ChatStore } from '../chat/ChatStore';
import { WebSocket } from 'ws';
import * as sqlite3 from 'sqlite3';

interface StatusClient {
	userId: number;
	socket: WebSocket;
	friendIds: number[];
}

class StatusWebSocketManager {
	private clients: Map<number, StatusClient> = new Map();

	constructor() {
		onlineStatusManager.on('statusChanged', (data: { userId: number; isOnline: boolean }) => {
			this.broadcastStatusChange(data.userId, data.isOnline);
		});
	}

	addClient(userId: number, socket: WebSocket, friendIds: number[]) {
		this.clients.set(userId, { userId, socket, friendIds });
	}

	removeClient(userId: number) {
		this.clients.delete(userId);
	}

	private broadcastStatusChange(userId: number, isOnline: boolean) {
		this.clients.forEach((client) => {
			if (client.friendIds.includes(userId)) {
				try {
					client.socket.send(JSON.stringify({
						type: 'STATUS_CHANGED',
						userId,
						isOnline,
					}));
				} catch (error) {
					console.error(`Failed to send status update to user ${client.userId}:`, error);
				}
			}
		});
	}
}

const statusManager = new StatusWebSocketManager();

export function registerStatusWebSocket(app: FastifyInstance, db: sqlite3.Database) {
	const chatStore = new ChatStore(db);

	console.log('Status WebSocket route registered at /ws/status');

	app.get('/ws/status', { websocket: true }, async (socket, req) => {
		console.log('New WebSocket connection attempt to /ws/status');
		const query = req.query as { token?: string };
		const token = query.token || req.headers['authorization']?.replace('Bearer ', '');

		if (!token) {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'Missing token' }));
			socket.close();
			return;
		}

		let userId = 0;
		let friendIds: number[] = [];

		try {
			const payload = jwt.verify(token, JWT_SECRET) as { id: number };
			userId = payload.id;
			console.log(`User ${userId} authenticated for status WebSocket`);
		} catch {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid token' }));
			socket.close();
			return;
		}

		try {
			friendIds = await chatStore.getFriendsList(userId);
		} catch (error) {
			console.error(`Failed to load friends list for user ${userId}:`, error);
			friendIds = [];
		}

		statusManager.addClient(userId, socket, friendIds);

		console.log(`Setting user ${userId} ONLINE via status WebSocket`);
		onlineStatusManager.setOnline(userId);

		const initialStatus = onlineStatusManager.getOnlineStatus(friendIds);
		socket.send(JSON.stringify({
			type: 'INITIAL_STATUS',
			status: initialStatus,
		}));

		let isAlive = true;
		const heartbeatInterval = setInterval(() => {
			if (!isAlive) {
				clearInterval(heartbeatInterval);
				socket.terminate();
				return;
			}

			isAlive = false;
			try {
				socket.ping();
			} catch (error) {
				clearInterval(heartbeatInterval);
			}
		}, 30000);

		socket.on('pong', () => {
			isAlive = true;
		});

		socket.on('message', (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString());
				if (message.type === 'PING') {
					socket.send(JSON.stringify({ type: 'PONG' }));
					isAlive = true;
				}
			} catch (error) {
				console.error('Failed to parse message:', error);
			}
		});

		socket.on('close', () => {
			console.log(`Setting user ${userId} OFFLINE - status WebSocket closed`);
			clearInterval(heartbeatInterval);
			statusManager.removeClient(userId);
			onlineStatusManager.setOffline(userId);
		});

		socket.on('error', (error) => {
			console.error(`WebSocket error for user ${userId}:`, error);
			clearInterval(heartbeatInterval);
			statusManager.removeClient(userId);
			onlineStatusManager.setOffline(userId);
		});

		console.log(`User ${userId} status WebSocket fully setup and ready`);
	});
}
