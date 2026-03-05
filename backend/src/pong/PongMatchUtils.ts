import { GameManager } from "../game/GameManager";
import { PongManager } from "./PongManager";
import { UserManager } from "../users/services/UserManager";
import { DEFAULT_FIELD, PongGame } from "./PongGame";
import { PongQuery } from './PongTypes';
import { getUserIdFromToken } from "../services/Auth";
import { tournamentManager } from '../tournament/TournamentManager';
import { PowerUpSettings } from './powerups/PowerUpTypes';
import { customMatchManager } from '../index';


export const games = new Map<string, PongGame>();
export const pendingGames = new Map<string, { [playerId: number]: { socket: any, displayName: string } }>();
type TimeoutRef = ReturnType<typeof setTimeout>;
const pendingTimers = new Map<string, TimeoutRef>();

export function handleLocalMatch(gameId: string, socket: any, query: PongQuery, db: any) {
	const playerNames = { 1: "Player 1", 2: "Player 2" };
	const options = { ...parseGameOptions(query, socket), isLocal: true };
	const game = new PongGame(gameId, playerNames, options);

	game.addClient(socket, 1);
	game.addClient(socket, 2);

	game.onGameOver = (gameInstance, winnerId) => {
		saveMatchToHistory(gameInstance, winnerId, db);
		socket.close();
		games.delete(gameId);
	};

	games.set(gameId, game);

	socket.on('message', (data: string) => {
		try {
			const msg = JSON.parse(data);
			if (
				msg.type === 'MOVE_PADDLE' &&
				(msg.direction === 'up' || msg.direction === 'down') &&
				(msg.player === 1 || msg.player === 2)
			) {
				game.movePaddle(msg.player, msg.direction);
			}
		} catch (e) {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
		}
	});

	socket.on('close', () => {
		games.delete(gameId);
	});
}

export async function authenticateUser(socket: any, token: string | undefined, userManager: UserManager, db: any) {
	let userId: number | null = null;
	let displayName: string | null = null;
	if (token) {
		userId = getUserIdFromToken(token);
		if (userId) {
			try {
				const user = await userManager.getUserFromDb(db, userId);
				displayName = user.displayName;
			} catch {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'User not found' }));
				socket.close();
			}
		} else {
			socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid token' }));
			socket.close();
		}
	}
	return { userId, displayName };
}

export function handlePendingGame(gameId: string, userId: number, displayName: string, socket: any, query: any, db: any) {

	checkTournamentAssignment(db, gameId).then((assignment) => {
		if (assignment) {

			if (assignment.status === 'finished' || assignment.winnerId) {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'This tournament match is already finished' }));
				setTimeout(() => socket.close(), 100);
				return;
			}

			const allowed = userId === assignment.player1Id || userId === assignment.player2Id;
			if (!allowed) {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'You are not assigned to this match' }));
				setTimeout(() => socket.close(), 100);
				return;
			}
		}

		proceedPendingJoin();
	}).catch(() => {

		proceedPendingJoin();
	});

	function proceedPendingJoin() {
	let pending = pendingGames.get(gameId) || {};
	pending[userId] = { socket, displayName };
	pendingGames.set(gameId, pending);

	if (Object.keys(pending).length === 2) {

		const t = pendingTimers.get(gameId);
		if (t) {
			clearTimeout(t);
			pendingTimers.delete(gameId);
		}
		const playerIds = Object.keys(pending).map(Number);
		const playerNames = {
			[playerIds[0]]: pending[playerIds[0]].displayName,
			[playerIds[1]]: pending[playerIds[1]].displayName,
		};

		let options = parseGameOptions(query, socket);


		if (gameId.startsWith('custom-')) {
			const invitationId = gameId.replace('custom-', '');
			const invitation = customMatchManager.getInvitation(invitationId);

			if (invitation) {

				const customSettings = invitation.settings;


				if (!options.field) {
					options.field = { ...DEFAULT_FIELD };
				}
				options.field.paddleHeight = customSettings.paddleSize;


				const powerUpSettings: PowerUpSettings = {
					bigPaddle: customSettings.powerups.bigPaddle,
					shield: customSettings.powerups.shield,
					spawnRate: 5
				};
				options.powerUpSettings = powerUpSettings;


				options.gameSpeed = customSettings.gameSpeed;


				customMatchManager.removeInvitation(invitationId);
			}
		}

		const game = new PongGame(gameId, playerNames, options);

		game.onGameOver = (gameInstance, winnerId) => {
			for (const client of gameInstance.clients) {
				client.close();
			}
			games.delete(gameId);
			saveMatchToHistory(gameInstance, winnerId, db);
		};

		games.set(gameId, game);

		game.addClient(pending[playerIds[0]].socket, playerIds[0]);
		game.addClient(pending[playerIds[1]].socket, playerIds[1]);

		pendingGames.delete(gameId);
	} else if (Object.keys(pending).length === 1) {

		if (!pendingTimers.has(gameId)) {
			const timer = setTimeout(async () => {
				try {
					const stillPending = pendingGames.get(gameId) || {};
					const ids = Object.keys(stillPending).map(Number);
					if (ids.length === 1) {
						const winnerId = ids[0];
						await forfeitTournamentMatch(db, gameId, winnerId);

						const client = stillPending[winnerId]?.socket;
						if (client) {
							client.send(JSON.stringify({ type: 'MATCH_FORFEIT', winnerId, message: 'Opponent did not show up. You win by forfeit.' }));
							setTimeout(() => client.close(), 250);
						}

						pendingGames.delete(gameId);
						pendingTimers.delete(gameId);
					}
				} catch (e) {
					console.error('Error handling forfeit timer:', e);
				}
			}, 60_000);
			pendingTimers.set(gameId, timer);
		}
	}
	}
}

function checkTournamentAssignment(db: any, gameId: string): Promise<{ player1Id?: number, player2Id?: number, status?: string, winnerId?: number } | null> {
	return new Promise((resolve, reject) => {
		db.get(
			"SELECT player1_id as player1Id, player2_id as player2Id, status, winner_id as winnerId FROM tournament_match WHERE game_id = ?",
			[gameId],
			(err: any, row: any) => {
				if (err) return reject(err);
				resolve(row || null);
			}
		);
	});
}

async function forfeitTournamentMatch(db: any, gameId: string, winnerId: number) {
	return new Promise<void>((resolve, reject) => {
		db.get(
			"SELECT id, player1_id as player1Id, player2_id as player2Id FROM tournament_match WHERE game_id = ?",
			[gameId],
			async (err: any, row: any) => {
				if (err) return reject(err);
				if (!row) return resolve();
				try {
					const manager = new tournamentManager(db);
					const p1Score = row.player1Id === winnerId ? 1 : 0;
					const p2Score = row.player2Id === winnerId ? 1 : 0;
					await manager.updateMatchResult(db, row.id, winnerId, p1Score, p2Score);
					resolve();
				} catch (e) {
					reject(e);
				}
			}
		);
	});
}

export function handlePlayerMessage(data: string, gameId: string, userId: number) {
	try {
		const msg = JSON.parse(data);
		if (
			msg.type === 'MOVE_PADDLE' &&
			(msg.direction === 'up' || msg.direction === 'down')
		) {
			const game = games.get(gameId);
			if (game && typeof userId === 'number') {
				game.movePaddle(userId, msg.direction);
			}
		}
	} catch (e) {
		const game = games.get(gameId);
		const client = game?.clients && Array.from(game.clients).find((c: any) => c.userId === userId);
		if (client) {
			client.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
		}
	}
}

export function handlePlayerDisconnect(gameId: string, socket: any, db: any, disconnectedPlayerId?: number) {
	const currgame = games.get(gameId);
	if (currgame) {
		currgame.removeClient(socket);


		if (!disconnectedPlayerId) {
			const connectedPlayerIds = Array.from(currgame.clients).map((client, idx) => currgame.playerIds[idx]);
			const allPlayerIds = currgame.playerIds;
			disconnectedPlayerId = allPlayerIds.find(id => !connectedPlayerIds.includes(id));
		}

		const allPlayerIds = currgame.playerIds;
		const remainingPlayerId = allPlayerIds.find(id => id !== disconnectedPlayerId);

		if (currgame.clients.size === 1 && remainingPlayerId !== undefined && disconnectedPlayerId !== undefined) {
			currgame.state.status = 'finished';


			currgame.state.scores[remainingPlayerId] = currgame.winCondition;
			currgame.state.scores[disconnectedPlayerId] = 0;

			const winnerName = currgame.playerNames[remainingPlayerId] || `Player ${remainingPlayerId}`;
			currgame.broadcast({
				type: 'GAME_OVER',
				winnerId: remainingPlayerId,
				winnerName,
				state: currgame.state,
				forfeit: true
			});
			currgame.stopGameLoop();
			games.delete(gameId);
			saveMatchToHistory(currgame, remainingPlayerId, db);
		} else if (currgame.clients.size < 1) {
			games.delete(gameId);
		}
	}
}

export function parseGameOptions(query: any, socket?: any) {
	const options: any = {};
	if (query.winCondition) options.winCondition = parseInt(query.winCondition, 10);

	if (query.custom_field) {
		try {
			const customField = JSON.parse(query.custom_field);
			options.field = { ...DEFAULT_FIELD, ...customField };
		} catch (err) {
			if (socket) {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid custom_field JSON' }));
				socket.close();
			}
			console.error('Invalid custom_field JSON:', query.custom_field, err);
			throw new Error('Invalid custom_field JSON');
		}
	} else {
		const field: any = {};
		if (query.fieldWidth) field.width = parseInt(query.fieldWidth, 10);
		if (query.fieldHeight) field.height = parseInt(query.fieldHeight, 10);
		if (Object.keys(field).length > 0) options.field = { ...DEFAULT_FIELD, ...field };
	}

	if (query.bigPaddle === 'true' || query.shield === 'true') {
		const powerUpSettings: PowerUpSettings = {
			bigPaddle: query.bigPaddle === 'true',
			shield: query.shield === 'true',
			spawnRate: parseInt(query.spawnRate) || 5
		};
		options.powerUpSettings = powerUpSettings;
	}

	return options;
}

export async function saveMatchToHistory(game: PongGame, winnerId: number, db: any) {
	// Prevent duplicate saves by checking if already saved
	if ((game as any)._historySaved) {
		console.log(`Match already saved to history, skipping duplicate`);
		return;
	}
	(game as any)._historySaved = true;

	const gameManager = new GameManager(db);
	const pongManager = new PongManager(db);

	const player1Id = game.playerIds[0];
	const player2Id = game.playerIds[1];
	const player1Score = game.state.scores[player1Id] || 0;
	const player2Score = game.state.scores[player2Id] || 0;

	// Always save result as player1Score-player2Score
	const result = `${player1Score}-${player2Score}`;

	await pongManager.saveMatchToHistory(player1Id, player2Id, result);

	if (!game.isLocal) {
		await gameManager.updateEloAfterMatch(db, player1Id, player2Id, player1Score, player2Score);
	}

	try {
		const tournamentMatch = await checkIfTournamentMatch(db, game.matchId);
		if (tournamentMatch) {
			const manager = new tournamentManager(db);

			const dbP1 = tournamentMatch.player1_id as number | undefined;
			const dbP2 = tournamentMatch.player2_id as number | undefined;
			const getScore = (uid?: number) => (uid ? (game.state.scores[uid] || 0) : 0);
			const p1Score = getScore(dbP1);
			const p2Score = getScore(dbP2);
			await manager.updateMatchResult(
				db,
				tournamentMatch.matchId,
				winnerId,
				p1Score,
				p2Score
			);
		}
	} catch (error) {
		console.error('Error checking tournament match:', error);

	}

	async function checkIfTournamentMatch(db: any, gameId: string): Promise<{ matchId: number; tournament_id?: number, player1_id?: number, player2_id?: number } | null> {
		return new Promise((resolve, reject) => {
			db.get(
				"SELECT id as matchId, tournament_id, player1_id, player2_id FROM tournament_match WHERE game_id = ?",
				[gameId],
				(err: Error | null, row: any) => {
					if (err)
						reject(err);
					else
						resolve(row || null);
				}
			);
		});
	}
}
