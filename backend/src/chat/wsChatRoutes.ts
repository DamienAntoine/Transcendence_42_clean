import { FastifyInstance } from "fastify";
import jwt from 'jsonwebtoken';
import { ChatRoomManager } from './ChatRoomManager';
import { ChatStore } from "./ChatStore";
import { onlineStatusManager } from "../users/services/OnlineStatusManager";
import { JWT_SECRET } from '../config/env';

const chatRoomManager = new ChatRoomManager();

export function registerChatWebSocket(app: FastifyInstance, chatStore: ChatStore) {

	app.get('/ws/chat/:chatRoomId', { websocket: true }, async (socket, req) => {
		const { chatRoomId } = req.params as { chatRoomId: string };
		const query = req.query as { token?: string };
		const token = query.token || req.headers['authorization']?.replace('Bearer ', '');
		let userId = 0;
		let userName = '';

		if (token) {
			try {
				const payload = jwt.verify(token, JWT_SECRET) as { id: number, userName: string };
				userId = payload.id;
				userName = payload.userName;
			} catch {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid token' }));
				socket.close();
				return;
			}
		}

		const chatBox = chatRoomManager.getOrCreateRoom(chatRoomId);
		chatBox.addClient(socket);

		onlineStatusManager.setOnline(userId);
		socket.on('close', () => onlineStatusManager.setOffline(userId));


		if (chatRoomId === 'global') {
			try {
				const messages = await chatStore.listGlobalChatMessages(50);
				socket.send(JSON.stringify({
					type: 'HISTORY',
					messages: messages.map(m => ({
						userId: m.senderId,
						displayName: m.senderName,
						content: m.content,
						timestamp: m.createdAt
					}))
				}));
			} catch (error) {
				console.error('Failed to load chat history:', error);
			}
		}

		socket.on('message', async message => {
			try {
				const parsed = JSON.parse(message.toString());

				if (parsed.type === 'PING') {
					socket.send(JSON.stringify({ type: 'PONG' }));
					return;
				}

				if (parsed.type === 'REQUEST_HISTORY' && chatRoomId === 'global') {
					try {
						const messages = await chatStore.listGlobalChatMessages(50);
						socket.send(JSON.stringify({
							type: 'HISTORY',
							messages: messages.map(m => ({
								userId: m.senderId,
								displayName: m.senderName,
								content: m.content,
								timestamp: m.createdAt
							}))
						}));
					} catch (error) {
						console.error('Failed to load chat history:', error);
						socket.send(JSON.stringify({ type: 'ERROR', message: 'Failed to load history' }));
					}
					return;
				}

				if (parsed.type === 'INVITE_PONG') {
					chatBox.broadcast({
						type: 'INVITE_PONG',
						from: userId,
						fromName: userName,
						to: parsed.to,
						gameOptions: parsed.gameOptions
					});
					return;
				}

				if (parsed.type !== 'CHAT_MESSAGE') {
					return;
				}


				let timestamp = new Date().toISOString();
				if (chatRoomId === 'global' && userId > 0) {
					try {
						const saved = await chatStore.saveGlobalChatMessage(userId, userName, parsed.content);
						timestamp = saved.createdAt;
					} catch (error) {
						console.error('Failed to save global chat message:', error);
					}
				}

				chatBox.broadcast({
					type: parsed.type,
					userId: userId,
					displayName: userName,
					content: parsed.content,
					timestamp: timestamp
				});
			} catch {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'Message must be valid JSON' }));
			}
		});

		socket.on('close', () => {
			chatRoomManager.removeClientFromRoom(chatRoomId, socket);
		});
		socket.on('error', () => {
			chatRoomManager.removeClientFromRoom(chatRoomId, socket);
		});
	});
}

export function registerDirectMessageWebSocket(app: FastifyInstance, chatStore: ChatStore) {
	app.get('/ws/chat/dm/:peerId', { websocket: true }, async (socket, req) => {
		const { peerId } = req.params as { peerId: string };
		const query = req.query as { token?: string };
		const token = query.token || req.headers['authorization']?.replace('Bearer ', '');

		if (!token) {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'Missing token' }));
			socket.close();
			return;
		}

		let userId = 0;
		let userName = '';
		try {
			const payload = jwt.verify(token, JWT_SECRET) as { id: number; userName: string };
			userId = payload.id;
			userName = payload.userName;
		} catch {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid token' }));
			socket.close();
			return;
		}

		const peerIdNum = Number(peerId);
		if (!Number.isInteger(peerIdNum) || peerIdNum <= 0) {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'peerId must be a positive integer' }));
			socket.close();
			return;
		}
		if (peerIdNum === userId) {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'Cannot open a DM with yourself' }));
			socket.close();
			return;
		}

		const a = Math.min(userId, Number(peerId));
		const b = Math.max(userId, Number(peerId));
		const roomId = `dm:${a}-${b}`;

		const chatBox = chatRoomManager.getOrCreateRoom(roomId);
		chatBox.addClient(socket);

		try {
			const [messages, lastReadId] = await Promise.all([
				chatStore.listDmMessages(userId, peerIdNum, { limit: 50 }),
				chatStore.getLastRead(userId, peerIdNum)
			]);
			socket.send(JSON.stringify({ type: 'HISTORY', roomId, messages, lastReadId }));
		} catch {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'Failed to load history' }));
		}

		socket.on('message', (raw) => {
			let parsed: any;
			try {
				parsed = JSON.parse(raw.toString());
			} catch {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'Message must be valid JSON' }));
				return;
			}

			if (parsed.type === 'REQUEST_HISTORY') {
				const limit = Math.min(100, Math.max(1, Number(parsed.limit) || 50));
				const beforeId = parsed.beforeId !== undefined ? Number(parsed.beforeId) : undefined;
				(async () => {
					try {
						const messages = await chatStore.listDmMessages(userId, peerIdNum, { limit, beforeId });
						const lastReadId = await chatStore.getLastRead(userId, peerIdNum);
						socket.send(JSON.stringify({ type: 'HISTORY', roomId, messages, lastReadId }));
					} catch (e: any) {
						socket.send(JSON.stringify({ type: 'ERROR', message: e.message || 'Failed to load history' }));
					}
				})();
				return;
			}

			if (parsed.type === 'MARK_READ') {
				const lastReadId = Number(parsed.lastReadId);
				(async () => {
					try {
						const updated = await chatStore.setLastRead(userId, peerIdNum, lastReadId);
						if (updated) chatBox.broadcast({ type: 'READ_RECEIPT', peerId: userId, lastReadId });
					} catch (e: any) {
						socket.send(JSON.stringify({ type: 'ERROR', message: e.message || 'Failed to update read state' }));
					}
				})();
				return;
			}

			const text = (parsed.message ?? '').toString();
			(async () => {
				try {
					const saved = await chatStore.saveDmMessage(userId, peerIdNum, text);
					chatBox.broadcast({
						type: 'DM_MESSAGE',
						roomId,
						id: saved.id,
						senderId: userId,
						senderName: userName,
						message: text,
						createdAt: saved.createdAt
					});
					await chatStore.setLastRead(userId, peerIdNum, saved.id);
					socket.send(JSON.stringify({ type: 'READ_RECEIPT', peerId: userId, lastReadId: saved.id }));
				} catch (e: any) {
					socket.send(JSON.stringify({ type: 'ERROR', message: e.message || 'Failed to save message' }));
				}
			})();
		});

		socket.on('close', () => {
			chatRoomManager.removeClientFromRoom(roomId, socket);
		});
		socket.on('error', () => {
			chatRoomManager.removeClientFromRoom(roomId, socket);
		});
	});
}
