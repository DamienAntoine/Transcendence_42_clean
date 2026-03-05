import { FastifyInstance } from "fastify";
import { UserManager } from "../users/services/UserManager";
import { PongQuery } from './PongTypes';
import * as matchUtils from './PongMatchUtils';
import * as matchMakingUtils from './PongMmUtils';
import { onlineStatusManager } from "../users/services/OnlineStatusManager";


export function registerPongWebSocket(app: FastifyInstance, db: any) {
	const userManager = new UserManager(db);

	app.get('/ws/pong/:gameId', { websocket: true }, async (socket, req) => {
		const { gameId } = req.params as { gameId: string };
		const query = req.query as PongQuery;

		if (query.mode == 'local') {
			matchUtils.handleLocalMatch(gameId, socket, query, db);
			return;
		}

		const { userId, displayName } = await matchUtils.authenticateUser(socket, query.token || req.headers['authorization'], userManager, db);
		if (!userId || !displayName) return;

		
		onlineStatusManager.setOnline(userId);

		matchUtils.handlePendingGame(gameId, userId, displayName, socket, query, db);

		socket.on('message', (data: string) => matchUtils.handlePlayerMessage(data, gameId, userId));
		socket.on('close', () => {
			onlineStatusManager.setOffline(userId);
			matchUtils.handlePlayerDisconnect(gameId, socket, db, userId);
		});
	});
}

export function registerPongMatchmakingWebSocket(app: FastifyInstance, db: any) {
	const userManager = new UserManager(db);

	app.get('/ws/pong/matchmaking', { websocket: true }, async (socket, req) => {
		app.log.info(`test`)
		const query = req.query as PongQuery;

		const { userId, displayName } = await matchUtils.authenticateUser(socket, query.token || req.headers['authorization'], userManager, db);
		if (!userId || !displayName) {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'Authentication failed' }));
			socket.close();
			return;
		}

		
		onlineStatusManager.setOnline(userId);

		matchMakingUtils.addPlayerToQueue(userId, socket, query, db);

		socket.on('message', (data: string) => {
			try {
				app.log.info(`received message: ${data}`)
				const msg = JSON.parse(data);
				if (msg.type === 'CANCEL_MATCHMAKING') {
					matchMakingUtils.removePlayerFromQueue(userId);
					socket.send(JSON.stringify({ type: 'MATCHMAKING_CANCELLED' }));
					setTimeout(() => socket.close(), 100);
				}
			} catch (e) {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
			}
		});

		socket.on('close', () => {
			onlineStatusManager.setOffline(userId);
			matchMakingUtils.removePlayerFromQueue(userId);
		});
	});
}


