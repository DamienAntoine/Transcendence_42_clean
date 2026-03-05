import * as sqlite3 from 'sqlite3';
import { FastifyInstance, FastifyRegister, FastifyReply, FastifyRequest} from 'fastify';
import * as jwt from 'jsonwebtoken';
import { tournamentController } from './TournamentController';
import { JoinTournamentBody } from './tournamentModels/JoinTournamentBody';
import { CreateTournamentBody } from './tournamentModels/CreateTournamentBody';
import { tournamentNotificationManager } from './TournamentNotificationManager';
import { JWT_SECRET } from '../config/env';

export async function tournamentRoutesPlugin(app: FastifyInstance, opts: { db: sqlite3.Database }) {
	const routes = new TournamentRoutes(opts.db);
	await routes.tournamentRoutes(app, opts.db);
}

export default class TournamentRoutes {
	private controller: tournamentController;

	constructor(db: sqlite3.Database) {
		this.controller = new tournamentController(db);
	}

	async tournamentRoutes(app: FastifyInstance, db: sqlite3.Database)
	{
		app.get('/list', (req: FastifyRequest, reply: FastifyReply) => {
			this.controller.getAvailableTournaments(req, reply, db);
		});

		app.get('/:id/status', (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
			this.controller.getTournamentStatus(req, reply, db);
		});

		app.get('/:id/participants', (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
			this.controller.getTournamentParticipants(req, reply, db);
		});

		app.get('/:id/matches', (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
			this.controller.getTournamentMatches(req, reply, db);
		});

		app.get('/:tournamentId/match/:matchId/result', (req: FastifyRequest<{ Params: { tournamentId: string, matchId: string } }>, reply: FastifyReply) => {
			this.controller.getTournamentMatchResult(req, reply, db);
		});

		app.get('/:tournamentId/match/:matchId/gameId', (req: FastifyRequest<{ Params: { tournamentId: string, matchId: string } }>, reply: FastifyReply) => {
			this.controller.getMatchGameId(req, reply, db);
		});



		app.post('/create', (req: FastifyRequest<{ Body: CreateTournamentBody }>, reply: FastifyReply) => {
			this.controller.createTournament(req, reply, db);
		});

		app.post('/:id/join', {
			schema: {
				body: {
					type: 'object',
					properties: {
						displayname: { type: 'string' }
					},
					required: ['displayname']
				}
			}
		}, (req: FastifyRequest<{ Params: { id: string }, Body: JoinTournamentBody }>, reply: FastifyReply) => {
			this.controller.joinTournament(req, reply, db);
		});

		app.post('/:id/leave', {
			schema: {
				body: {
					type: 'object',
					properties: {
						userId: { type: 'number' },
						displayname: { type: 'string' }
					},
					anyOf: [
						{ required: ['userId'] },
						{ required: ['displayname'] }
					]
				}
			}
		}, (req: FastifyRequest<{ Params: { id: string }, Body: { userId?: number, displayname?: string } }>, reply: FastifyReply) => {
			this.controller.leaveTournament(req, reply, db);
		});

		app.post('/:id/start', (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
			this.controller.startTournament(req, reply, db);
		});

		app.post('/:id/finish', (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
			this.controller.finishTournament(req, reply, db);
		});

		app.put('/:tournamentId/match/:matchId/result', {
			schema: {
				body: {
					type: 'object',
					properties: {
						winnerId: { type: 'number' },
						player1Score: { type: 'number' },
						player2Score: { type: 'number' }
					},
					required: ['winnerId', 'player1Score', 'player2Score']
				}
			}
		}, (req: FastifyRequest<{
			Params: { tournamentId: string, matchId: string },
			Body: { winnerId: number, player1Score: number, player2Score: number }
		}>, reply: FastifyReply) => {
			this.controller.updateTournamentMatchResult(req, reply, db);
		});

		app.get('/ws/:tournamentId', { websocket: true }, (socket, req) => {
			const { tournamentId } = req.params as { tournamentId: string };
			const query = req.query as { token?: string };
			const token = query.token || req.headers['authorization']?.replace('Bearer ', '');

			if (!token) {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'Authentication required' }));
				socket.close();
				return;
			}

		try {
			const payload = jwt.verify(token, JWT_SECRET) as { id: number, userName: string };
			const userId = payload.id;				
				tournamentNotificationManager.addUserToTournament(tournamentId, userId, socket);

				socket.on('close', () => {
					tournamentNotificationManager.removeUserFromTournament(tournamentId, userId);
				});

			} catch {
				socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid token' }));
				socket.close();
			}
		});
	}
}

