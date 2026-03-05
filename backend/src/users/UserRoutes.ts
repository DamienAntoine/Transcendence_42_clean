import * as sqlite3 from 'sqlite3';
import { FastifyInstance, FastifyRegister, FastifyReply, FastifyRequest} from 'fastify';
import { UserController } from './UserController'
import { GetUserParams } from './userModels/GetUserParams';
import { RegisterUserBody } from './userModels/RegisterUserBody';
import { LoginUserBody } from './userModels/LoginUserBody';
import { UserLeaderboardRow } from './userModels/UserLeaderboardRow';
import { getUserIdFromRequest } from "../services/Auth";

export async function userRoutesPlugin(app: FastifyInstance, opts: { db: sqlite3.Database }) {
	const routes = new UserRoutes(opts.db);
	await routes.userRoutes(app, opts.db);
}

export default class UserRoutes {
	private controller: UserController;

	constructor(db: sqlite3.Database) {
		this.controller = new UserController(db);
	}

	async userRoutes(app: FastifyInstance, db: sqlite3.Database)
	{
		app.get('/:id', (req: FastifyRequest<{ Params: GetUserParams }>, reply: FastifyReply) => {
			this.controller.getUser(req, reply, db);
		});

		app.get('/leaderboard', (req: FastifyRequest<{ Params: UserLeaderboardRow }>, reply: FastifyReply) => {
			this.controller.getUserSortedByElo(req, reply, db);
		});

		app.get('/me', async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}
			try {
				const row = await this.controller.manager.getUserFromDb(db, userId);
				if (!row) {
					return reply.status(404).send({ error: "User not found" });
				}
				return reply.send(row);
			} catch (err: any) {
				return reply.status(500).send({ error: err.message });
			}
		});

		app.get('/:id/gamehistory', (req: FastifyRequest<{ Params: GetUserParams }>, reply: FastifyReply) => {
			this.controller.getMatchHistoryById(req, reply, db);
		});

		app.get('/:id/stats', (req: FastifyRequest<{ Params: GetUserParams }>, reply: FastifyReply) => {
			this.controller.getUserStats(req, reply, db);
		});

		app.post('/register', {
			schema: {
				body: {
					type: 'object',
					properties: {
						userName: { type: 'string' },
						displayName: { type: 'string' },
						password: { type: 'string' },
						email: { type: 'string' }
					},
					required: ['userName', 'displayName', 'password']
				}
			}
		}, (req: FastifyRequest<{ Body: RegisterUserBody }>, reply: FastifyReply) => {
			this.controller.registerUser(req, reply, db)
		});

		app.put('/enable2fa', async (req:FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(400).send({ error: 'Unauthorized' });
			}

		await this.controller.enable2fa(req, reply, db, userId);
		});

		app.post('/verify2fa', async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			const { otp } = req.body as { otp: string };
			if (!userId || !otp) {
				return reply.status(400).send({ error: 'Missing user or code' });
			}

			this.controller.verify2fa(req, reply, db, userId);
		});

		app.post('/login', {
			schema: {
				body: {
					type: 'object',
					properties: {
						userName: { type: 'string' },
						password: { type: 'string' }
					},
					required: ['userName', 'password']
				}
			}
		}, (req: FastifyRequest<{ Body: LoginUserBody }>, reply: FastifyReply) => {
			this.controller.loginUser(req, reply, db)
		});

		app.post('/login2fa', {
			schema: {
				body: {
					type: 'object',
					properties: {
						userName: { type: 'string' },
						otp: { type: 'string' }
					},
					required: ['userName', 'otp']
				}
			}
		}, async (req: FastifyRequest, reply: FastifyReply) => {
			await this.controller.login2fa(req, reply, db);
		});

		app.put('/updateDisplayName', {
			schema: {
				body: {
					type: 'object',
					properties: {
						displayName: { type: 'string' }
					},
					required: ['displayName']
				}
			}
		}, async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}
			await this.controller.updateDisplayName(req, reply, db, userId);
		});

		app.put('/updatePassword', {
			schema: {
				body: {
					type: 'object',
					properties: {
						password: { type: 'string' },
						newPassword: { type: 'string' }
					},
					required: ['password, newPassword']
				}
			}
		}, async (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}
			await this.controller.updatePassword(req, reply, db, userId);
		});

		app.put('/uploadpicture', {
			schema: {
				description: 'Route unusable from Swagger, test with postman / curl',
				consumes: ['multipart/form-data'],
				headers: {
					type: 'object',
					properties: {
						authorization: { type: 'string' }
					},
					required: ['authorization']
				}
			}
		}, (req: FastifyRequest, reply: FastifyReply) => {
			const userId = getUserIdFromRequest(req);
			if (!userId) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			this.controller.uploadProfilePicture(req, reply, db, userId);
		});
	}
}
