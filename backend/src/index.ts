
import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import sqlite3 from 'sqlite3'
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import multipart from '@fastify/multipart'
import path from 'path';
import fs from 'fs';
import UserRoutes, { userRoutesPlugin } from './users/UserRoutes';
import GameRoutes, { gameRoutesPlugin } from './game/GameRoutes';
import { setupDatabase } from './db/SetupDatabase';
import { registerPongMatchmakingWebSocket, registerPongWebSocket } from './pong/PongWSController';
import { registerChatWebSocket, registerDirectMessageWebSocket } from './chat/wsChatRoutes';
import { registerStatusWebSocket } from './users/wsStatusRoutes';
import { ChatStore } from './chat/ChatStore';
import { chatRoutesPlugin } from './chat/http/httpChatRoutes';
import { tournamentRoutesPlugin } from './tournament/TournamentRoutes';
import { CustomMatchManager } from './pong/CustomMatchManager';
import { registerCustomMatchRoutes } from './pong/CustomMatchRoutes';
import { ensureCertsExist } from './utils/ensureCerts';


if (!process.env.JWT_SECRET) {
	console.error('ERROR: JWT_SECRET is not set in environment variables!');
	process.exit(1);
}

export const customMatchManager = new CustomMatchManager();

async function buildApp() {
	// Ensure SSL certificates exist (generate if needed)
	ensureCertsExist();

	// Load SSL certificates for HTTPS
	const certsPath = path.resolve(process.cwd(), 'certs');
	const httpsOptions = {
		key: fs.readFileSync(path.join(certsPath, 'key.pem')),
		cert: fs.readFileSync(path.join(certsPath, 'cert.pem'))
	};

	const app = Fastify({
		logger: true,
		https: httpsOptions,
		bodyLimit: 10 * 1024 * 1024,
		requestTimeout: 120000,
		connectionTimeout: 120000,
		keepAliveTimeout: 120000
	});
	const db = new sqlite3.Database("Transcendence.db");

	setupDatabase(db);

	const chatStore = new ChatStore(db);


	const allowedOrigins = process.env.FRONTEND_URL
		? process.env.FRONTEND_URL.split(',').map(url => url.trim())
		: null;

	await app.register(cors, {
		origin: (origin, cb) => {
			if (!origin) {
				cb(null, true);
				return;
			}

			if (allowedOrigins) {
				if (allowedOrigins.includes(origin)) {
					cb(null, true);
				} else {
					cb(new Error('Not allowed by CORS'), false);
				}
			} else {
				try {
					const url = new URL(origin);
					if ((url.protocol === 'https:' || url.protocol === 'http:') && url.port === '5173') {
						cb(null, true);
					} else {
						cb(new Error('Not allowed by CORS'), false);
					}
				} catch {
					cb(new Error('Invalid origin'), false);
				}
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
	});


	await app.register(multipart, {
		attachFieldsToBody: false,
		limits: {
			fieldNameSize: 100,
			fieldSize: 100,
			fields: 10,
			fileSize: 10 * 1024 * 1024,
			files: 1,
			headerPairs: 2000
		}
	});

	app.setErrorHandler((error, request, reply) => {
		if (error.code === 'FST_INVALID_MULTIPART_CONTENT_TYPE') {
			return reply.status(406).send({ error: 'Content-Type must be multipart/form-data for file uploads.' });
		}
		if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
			return reply.status(413).send({ error: 'File too large. Maximum size is 10MB.' });
		}
		reply.send(error);
	});


	app.get('/avatars/:filename', async (req, reply) => {
		const { filename } = req.params as { filename: string };
		const avatarDir = path.join(process.cwd(), 'data/avatars');
		const filepath = path.join(avatarDir, filename);


		if (!fs.existsSync(filepath) || !filepath.startsWith(avatarDir)) {
			return reply.status(404).send({ error: 'File not found' });
		}


		const ext = path.extname(filename).toLowerCase();
		const mimeTypes: Record<string, string> = {
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.webp': 'image/webp'
		};
		const mimeType = mimeTypes[ext] || 'application/octet-stream';

		reply.type(mimeType);
		return reply.send(fs.createReadStream(filepath));
	});

	await app.register(websocket, {
		options: {
			maxPayload: 4096
		}
	});
	registerPongWebSocket(app, db);
	registerPongMatchmakingWebSocket(app, db);
	registerChatWebSocket(app, chatStore);
	registerDirectMessageWebSocket(app, chatStore);
	registerStatusWebSocket(app, db);

	await app.register(swagger, {
		openapi: {
			info: {
				title: 'Transcendence API',
				description: 'API documentation',
				version: '1.0.0'
			},
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT'
					}
				}
			},
			security: [{ bearerAuth: [] }]
		}
	});

	await app.register(swaggerUI, {
		routePrefix: '/docs'
	});

	await app.register(userRoutesPlugin, { db, prefix: '/user' });
	await app.register(gameRoutesPlugin, { db, prefix: '/game' });
	await app.register(chatRoutesPlugin, { db, prefix: '/chat' });
	await app.register(tournamentRoutesPlugin, { db, prefix: '/tournament' });


	registerCustomMatchRoutes(app, customMatchManager, db);

	return app;
}

buildApp().then(app => {
	app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
		if (err) {
			app.log.error(err);
			process.exit(1);
		}
		app.log.info(`Server running at ${address}`);
	});
});
