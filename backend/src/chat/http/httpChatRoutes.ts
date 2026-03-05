import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as sqlite3 from "sqlite3";
import { ChatStore } from "../ChatStore";
import { getUserIdFromRequest } from "../../services/Auth";
import { onlineStatusManager } from "../../users/services/OnlineStatusManager";

export async function chatRoutesPlugin(app: FastifyInstance, opts: { db: sqlite3.Database }) {
	const routes = new ChatRoutes(opts.db);
	await routes.chatRoutes(app, opts.db);
}

export default class ChatRoutes {
	constructor(db: sqlite3.Database) {
	}

	async chatRoutes(app: FastifyInstance, db: sqlite3.Database) {
		const chatStore = new ChatStore(db);

		app.get('/dm/:peerId/messages', async (req: FastifyRequest<{ Params: { peerId: string }, Querystring: { limit?: string, beforeId?: string } }>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const peerId = parseInt(req.params.peerId, 10);
			if (isNaN(peerId)) {
				return reply.status(400).send({ error: 'Invalid peerId' });
			}

			const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
			const beforeId = req.query.beforeId ? parseInt(req.query.beforeId, 10) : undefined;

			try {
				const messages = await chatStore.listDmMessages(userId, peerId, { limit, beforeId });
				return reply.send({ messages });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.post('/dm/:peerId/block', async (req: FastifyRequest<{ Params: { peerId: string }}>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const peerId = parseInt(req.params.peerId, 10);
			if (isNaN(peerId)) {
				return reply.status(400).send({ error: 'Invalid peerId' });
			}
			try {
				const blocked = await chatStore.blockUser(userId, peerId);
				return reply.send(({ blocked }));
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.delete('/dm/:peerId/unblock', async (req: FastifyRequest<{ Params: { peerId: string }}>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const peerId = parseInt(req.params.peerId, 10);
			if (isNaN(peerId)) {
				return reply.status(400).send({ error: 'Invalid peerId' });
			}
			try {
				const unblocked = await chatStore.unblockUser(userId, peerId);
				return reply.send(({ unblocked }));
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.get('/dm/:peerId/isBlocked', async (req: FastifyRequest<{ Params: { peerId: string }}>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const peerId = parseInt(req.params.peerId, 10);
			if (isNaN(peerId)) {
				return reply.status(400).send({ error: 'Invalid peerId' });
			}
			try {
				const isBlocked = await chatStore.hasBlocked(userId, peerId);
				return reply.send({ isBlocked });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.post('/dm/:peerId/read', async (req: FastifyRequest<{ Params: { peerId: string }}>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const peerId = parseInt(req.params.peerId, 10);
			if (isNaN(peerId)) {
				return reply.status(400).send({ error: 'Invalid peerId' });
			}

			const { lastReadId } = req.body as { lastReadId?: number };
			if (!lastReadId || typeof lastReadId !== "number") {
				return reply.status(400).send({ error: 'Invalid Message Id' });
			}

			try {
				const success = await chatStore.setLastRead(userId, peerId, lastReadId);
				if (success) {
					return reply.send({ success: true });
				} else {
					return reply.status(500).send({ error: 'Failed to update last read' });
				}
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.get('/unread', async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}
			try {
				const summary = await chatStore.summaryUnread(userId);
				return reply.send({ summary });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.get('/friends/list', async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}
			try {
				const friends = await chatStore.getFriendsList(userId);
				return reply.send({ friends });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.post('/friends/:friendId/sendRequest', async (req: FastifyRequest<{ Params: { friendId: string }}>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const friendId = parseInt(req.params.friendId, 10);
			if (isNaN(friendId)) {
				return reply.status(400).send({ error: 'Invalid friendId' });
			}

			try {
				const friendRequest = await chatStore.requestFriend(userId, friendId);
				return reply.send({ friendRequest });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});


		app.post('/friends/:friendId/acceptRequest', async (req: FastifyRequest<{ Params: { friendId: string }}>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const friendId = parseInt(req.params.friendId, 10);
			if (isNaN(friendId)) {
				return reply.status(400).send({ error: 'Invalid friendId' });
			}

			try {


				const friendResponse = await chatStore.acceptFriendRequest(friendId, userId);
				return reply.send({ friendResponse });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.post('/friends/:friendId/rejectRequest', async (req: FastifyRequest<{ Params: { friendId: string }}>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const friendId = parseInt(req.params.friendId, 10);
			if (isNaN(friendId)) {
				return reply.status(400).send({ error: 'Invalid friendId' });
			}

			try {


				const friendResponse = await chatStore.rejectFriendRequest(friendId, userId);
				return reply.send({ friendResponse });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.delete('/friends/:friendId/removeFriend', async (req: FastifyRequest<{ Params: { friendId: string }}>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const friendId = parseInt(req.params.friendId, 10);
			if (isNaN(friendId)) {
				return reply.status(400).send({ error: 'Invalid friendId' });
			}

			try {
				const deletedFriend = await chatStore.deleteFriend(userId, friendId);
				return reply.send({ deletedFriend });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.get('/friends/status', async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const friends = await chatStore.getFriendsList(userId);
			const status = await onlineStatusManager.getOnlineStatus(friends);
			return reply.send({ status });
		});


		app.post('/heartbeat', async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			onlineStatusManager.setOnline(userId);
			return reply.send({ success: true });
		});

		app.get('/friends/pending/received', async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			try {
				const requests = await chatStore.getPendingReceivedRequests(userId);
				return reply.send({ requests });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.get('/friends/pending/sent', async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			try {
				const requests = await chatStore.getPendingSentRequests(userId);
				return reply.send({ requests });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.delete('/friends/:friendId/cancelRequest', async (req: FastifyRequest<{ Params: { friendId: string }}>, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			const friendId = parseInt(req.params.friendId, 10);
			if (isNaN(friendId)) {
				return reply.status(400).send({ error: 'Invalid friendId' });
			}

			try {
				const cancelled = await chatStore.cancelFriendRequest(userId, friendId);
				return reply.send({ cancelled });
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});
	}
}
