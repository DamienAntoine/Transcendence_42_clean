import * as sqlite3 from 'sqlite3';
import { FastifyInstance, FastifyRegister, FastifyReply, FastifyRequest} from 'fastify';
import { GameController } from './GameController';
import { GameParams } from './gameModels/GameParams'
import { generateGameId } from '../pong/PongMmUtils';

export async function gameRoutesPlugin(app: FastifyInstance, opts: { db: sqlite3.Database }) {
	const routes = new GameRoutes(opts.db);
	await routes.GameRoutes(app, opts.db);
}

export default class GameRoutes {
	private controller: GameController;


	constructor(db: sqlite3.Database) {
		this.controller = new GameController(db);
	}

	async GameRoutes(app: FastifyInstance, db: sqlite3.Database) {
		app.post('/', {
		schema: {
			body: {
				type: 'object',
				properties: {
					player1Id: { type: 'number' },
					player2Id: { type: 'number' }
				},
				required: ['player1Id', 'player2Id']
			}
		}
		}, (req: FastifyRequest<{ Body: GameParams }>, reply: FastifyReply) => {
		this.controller.createMatch(req, reply, db);
		});

		app.patch('/start', (req: FastifyRequest, reply: FastifyReply) => {
			this.controller.startMatch(req, reply, db);
		});

		app.patch('/finish', (req: FastifyRequest, reply: FastifyReply) => {
			this.controller.finishMatch(req, reply, db);
		});

		app.get('/:id/match', (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
			this.controller.getMatchInfo(req, reply, db);
		});

		app.get('/pong/generateGameId', async (req, reply) => {
			const gameId = generateGameId();
			return reply.send({ gameId });
		});
	}
}
