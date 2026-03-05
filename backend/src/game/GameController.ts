import * as sqlite3 from 'sqlite3';
import { FastifyReply, FastifyRequest } from 'fastify';
import { GameManager } from './GameManager';
import { UserManager } from '../users/services/UserManager';
import { GameParams } from './gameModels/GameParams'
import { UserDbRow } from '../users/userModels/UserDbRow';

export class GameController {
	public gameManager: GameManager;
	public userManager: UserManager;

	constructor(db: sqlite3.Database) {
		this.gameManager = new GameManager(db);
		this.userManager = new UserManager(db);
	}

	async createMatch(
		req: FastifyRequest<{ Body: GameParams }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const { player1Id, player2Id } = req.body;

			const player1 = await this.userManager.getUserFromDb(db, player1Id) as UserDbRow;
			const player2 = await this.userManager.getUserFromDb(db, player2Id) as UserDbRow;

			if (!player1 || !player2) {
				return reply.status(400).send({ error: "One or both players not found" });
			}

			const p1Elo = player1.elo;
			const p2Elo = player2.elo;

			const p1EloIfWin = this.gameManager.calculateElo(p1Elo, p2Elo, 1);
			const p1EloIfLose = this.gameManager.calculateElo(p1Elo, p2Elo, 0);
			const p2EloIfWin = this.gameManager.calculateElo(p2Elo, p1Elo, 1);
			const p2EloIfLose = this.gameManager.calculateElo(p2Elo, p1Elo, 0);

			const match = await this.gameManager.createMatchToDb(db, req.body);

			return reply.send({
				match,
				eloPreview: {
					player1: { current: p1Elo, ifWin: p1EloIfWin, ifLose: p1EloIfLose },
					player2: { current: p2Elo, ifWin: p2EloIfWin, ifLose: p2EloIfLose }
				}
			});
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	}

	async startMatch(
		req: FastifyRequest,
		reply: FastifyReply,
		db: sqlite3.Database
	) {

	}
	async finishMatch(
		req: FastifyRequest,
		reply: FastifyReply,
		db: sqlite3.Database
	) {

	}

	async getMatchInfo(
		req: FastifyRequest<{Params: { id: string }}>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const row = await this.gameManager.getMatchInfoFromDb(db, Number(req.params.id));
			if (!row) {
				return reply.status(404).send({ error: "Match not found "});
			}
			return reply.send(row);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message});
		}
	}
}
