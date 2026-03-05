import { UserManager } from "../users/services/UserManager";
import { handlePendingGame } from "./PongMatchUtils";
import { QueuedPlayer } from "./PongTypes";

export const queuedPlayers = new Map<number, QueuedPlayer>();
let matchmakingInterval: NodeJS.Timeout | null = null;

export async function addPlayerToQueue(playerId: number, socket: any, query: any, db: any) {
	const userManager = new UserManager(db);
	const user = await userManager.getUserFromDb(db, playerId);
	const elo = user.elo;

	queuedPlayers.set(playerId, {
		playerId,
		socket,
		elo,
		displayName: user.displayName,
		query,
		db,
		joinedAt: Date.now()
	});

	if (!matchmakingInterval) {
		matchmakingInterval = setInterval(() => {
			tryMatchPlayers(db);
		}, 5000);
	}

	tryMatchPlayers(db);
}

export function removePlayerFromQueue(playerId: number) {
	queuedPlayers.delete(playerId);

	if (queuedPlayers.size === 0 && matchmakingInterval) {
		clearInterval(matchmakingInterval);
		matchmakingInterval = null;
	}
}

function tryMatchPlayers(db: any) {
	console.log("trymatchplayers");
	const players = Array.from(queuedPlayers.values());
	const MATCH_ELO_RANGE_START = 100;
	const MATCH_ELO_RANGE_STEP = 50;

	for (let i = 0; i < players.length; i++) {
		const p1 = players[i];
		let bestMatch: QueuedPlayer | null = null;
		let bestEloDiff = Infinity;
		let currentRange = MATCH_ELO_RANGE_START + Math.floor((Date.now() - p1.joinedAt) / 30000) * MATCH_ELO_RANGE_STEP;

		for (let j = 0; j < players.length; j++) {
			if (i === j) {
				continue;
			}
			const p2 = players[j];
			const eloDiff = Math.abs(p1.elo - p2.elo);
			if (eloDiff <= currentRange && eloDiff < bestEloDiff) {
				bestMatch = p2;
				bestEloDiff = eloDiff;
			}
		}

		if (bestMatch) {
			queuedPlayers.delete(p1.playerId);
			queuedPlayers.delete(bestMatch.playerId);

			const gameId = generateGameId();

			
			p1.socket.send(JSON.stringify({
				type: 'MATCH_FOUND',
				gameId: gameId,
				opponentName: bestMatch.displayName,
				opponentElo: bestMatch.elo
			}));

			bestMatch.socket.send(JSON.stringify({
				type: 'MATCH_FOUND',
				gameId: gameId,
				opponentName: p1.displayName,
				opponentElo: p1.elo
			}));

			
			setTimeout(() => {
				p1.socket.close();
				bestMatch.socket.close();
			}, 100);

			
			
			
			

			break;
		}
	}
}

export function generateGameId(): string {
	return Math.random().toString(36).substr(2, 9);
}
