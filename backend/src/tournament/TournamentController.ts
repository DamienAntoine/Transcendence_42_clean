import { FastifyReply, FastifyRequest } from 'fastify';
import * as sqlite3 from 'sqlite3';
import { tournamentManager } from './TournamentManager';
import { CreateTournamentBody } from './tournamentModels/CreateTournamentBody';
import { JoinTournamentBody } from './tournamentModels/JoinTournamentBody';
import { getUserIdFromRequest } from '../services/Auth';
import { UserManager } from '../users/services/UserManager';

export class tournamentController {
	public manager: tournamentManager;

	constructor(db: sqlite3.Database) {
		this.manager = new tournamentManager(db);
	}

	async getAvailableTournaments(
		req: FastifyRequest,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const row = await this.manager.getAvailableTournamentsFromDb(db);
			if (!row || row.length == 0) {
				return reply.status(404).send({ error: "No available tournaments" });
			}
			return reply.send(row);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async getTournamentStatus(
		req: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const tournamentId = Number(req.params.id);
			const row = await this.manager.getTournamentStatusFromDb(db, tournamentId);
			if (!row) {
				return reply.status(404).send({ error: "Tournament ID not found" });
			}
			return reply.send(row);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async getTournamentParticipants(
		req: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const tournamentId = Number(req.params.id);
			const row = await this.manager.getTournamentParticipantsFromDb(db, tournamentId);
			if (!row || row.length == 0) {
				return reply.status(404).send({ error: "Tournament ID not found or tournament empty" });
			}
			return reply.send(row);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async getTournamentMatches(
		req: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const tournamentId = Number(req.params.id);
			const row = await this.manager.getTournamentMatchesFromDb(db, tournamentId);
			if (!row || row.length == 0) {
				return reply.status(404).send({ error: "Tournament ID not found" });
			}
			return reply.send(row);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async getTournamentMatchResult(
		req: FastifyRequest<{ Params: { tournamentId: string, matchId: string } }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const tournamentId = Number(req.params.tournamentId);
			const matchId = Number(req.params.matchId);
			const row = await this.manager.getTournamentMatchResultFromDb(db, tournamentId, matchId);
			if (!row) {
				return reply.status(404).send({ error: "Tournament ID not found" });
			}
			return reply.send(row);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}


	async createTournament(
		req: FastifyRequest<{ Body: CreateTournamentBody }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		let creatorId = getUserIdFromRequest(req);
		if (creatorId === null) {
			return reply.status(401).send({ error: "Unauthorized" });
		}
		try {
			const body = { ...req.body, creator_id: creatorId };
			const row = await this.manager.createTournamentFromDb(db, body);
			return reply.send(row);
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	}

	async joinTournament(
		req: FastifyRequest<{ Params: { id: string }, Body: JoinTournamentBody }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		const userId = getUserIdFromRequest(req);
		let displayname = req.body.displayname;
		let guest = false;

		if (userId) {
			const userManager = new UserManager(db);
			const user = await userManager.getUserFromDb(db, userId);
			if (!user) {
				return reply.status(404).send({ error: "User not found" });
			}
			displayname = user.displayName;
			guest = false;
		} else {
			if (!displayname || typeof displayname !== 'string') {
				return reply.status(400).send({ error: "Missing or invalid displayname for guest" });
			}
			guest = true;
		}

		try {
			const tournamentId = Number(req.params.id);
			const row = await this.manager.joinTournamentFromDb(db, tournamentId, { userId, displayname, guest });
			return reply.send(row);
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	}

	async leaveTournament(
		req: FastifyRequest<{ Params: { id: string }, Body: { userId?: number, displayname?: string } }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		const userId = getUserIdFromRequest(req);
		const tournamentId = Number(req.params.id);
		let displayname = req.body.displayname;

		if (userId) {
			try {
				const result = await this.manager.leaveTournamentFromDb(db, tournamentId, { userId });
				return reply.send(result);
			} catch (err: any) {
				return reply.status(400).send({ error: err.message });
			}
		} else {
			if (!displayname || typeof displayname !== 'string') {
				return reply.status(400).send({ error: "Missing or invalid displayname for guest" });
			}
			try {
				const result = await this.manager.leaveTournamentFromDb(db, tournamentId, { displayname });
				return reply.send(result);
			} catch (err: any) {
				return reply.status(400).send({ error: err.message });
			}
		}
	}

	async startTournament(
		req: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		const creatorId = getUserIdFromRequest(req);
		if (!creatorId) {
			return reply.status(401).send({ error: "Unauthorized" });
		}
		try {
			const tournamentId = Number(req.params.id);
			const row = await this.manager.startTournamentFromDb(db, tournamentId, { creatorId });
			return reply.send(row);
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	}

	async finishTournament(
		req: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
			try {
				const tournamentId = Number(req.params.id);
				
				const creatorId = getUserIdFromRequest(req) || undefined;
				const row = await this.manager.finishTournamentFromDb(db, tournamentId, creatorId);
			return reply.send(row);
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	}

	async updateTournamentMatchResult(
		req: FastifyRequest<{
			Params: { tournamentId: string, matchId: string },
			Body: { winnerId: number, player1Score: number, player2Score: number }
		}>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const tournamentId = Number(req.params.tournamentId);
			const matchId = Number(req.params.matchId);
			const { winnerId, player1Score, player2Score} = req.body;

			const result = await this.manager.updateMatchResult(db, matchId, winnerId, player1Score, player2Score);
			return reply.send(result);
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	}

	async getMatchGameId(
		req: FastifyRequest<{ Params: { tournamentId: string, matchId: string } }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const tournamentId = Number(req.params.tournamentId);
			const matchId = Number(req.params.matchId);
			const match = await this.manager.getMatchGameIdFromDb(db, tournamentId, matchId);
			if (!match) {
				return reply.status(404).send({ error: "Match not found" });
			}
			return reply.send({ gameId: match.game_id, tournamentId, matchId });
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}
}


