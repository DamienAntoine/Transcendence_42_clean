import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { GetUserParams } from './userModels/GetUserParams';
import { RegisterUserBody } from './userModels/RegisterUserBody';
import { LoginUserBody } from './userModels/LoginUserBody';
import { UserLeaderboardRow } from './userModels/UserLeaderboardRow';
import { UserManager } from './services/UserManager';
import { validatePassword } from '../services/PasswordHasher';
import { sendOtpEmail } from './services/EmailSender';
import { JWT_SECRET } from '../config/env';
import * as sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import { pipeline } from 'stream';
import { promisify } from 'util';
import * as fs from 'fs';

export class UserController {
	public manager: UserManager;

	constructor(db: sqlite3.Database) {
		this.manager = new UserManager(db);
	}

	async getUser(
		req: FastifyRequest<{ Params: GetUserParams }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const row = await this.manager.getUserFromDb(db, Number(req.params.id));
			if (!row) {
				return reply.status(404).send({ error: "User not found" });
			}
			return reply.send(row);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async getUserSortedByElo(
		req: FastifyRequest<{ Params: UserLeaderboardRow }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const row = await this.manager.getUserSortedByEloFromDb(db);
			if (!row) {
				return reply.status(404).send({ error: "No user registered" });
			}
			return reply.send(row);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async getMatchHistoryById(
		req: FastifyRequest<{ Params: GetUserParams }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const user = await this.manager.getUserFromDb(db, Number(req.params.id));
			if (!user) {
				return reply.status(404).send({ error: "User not found" });
			}

			const rows = await this.manager.getMatchHistoryByUserId(db, Number(req.params.id));
			if (!rows || rows.length === 0) {
				return reply.status(404).send({ error: "User has no matches played"});
			}
			return reply.send(rows);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async getUserStats(
		req: FastifyRequest<{ Params: GetUserParams }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const user = await this.manager.getUserFromDb(db, Number(req.params.id));
			if (!user) {
				return reply.status(404).send({ error: "User not found" });
			}

			const stats = await this.manager.getUserStatsFromDb(db, Number(req.params.id));
			return reply.send(stats);
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async registerUser(
		req: FastifyRequest<{ Body: RegisterUserBody }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			await this.manager.fieldExists(db, 'userName', req.body.userName);
			await this.manager.fieldExists(db, 'displayName', req.body.displayName);
			await this.manager.fieldExists(db, 'email', req.body.email);

			const row = await this.manager.registerUserToDb(db, req.body);
			return reply.send(row);
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	}

	async enable2fa(
		req: FastifyRequest,
		reply: FastifyReply,
		db: sqlite3.Database,
		userId: number
	) {
		try {
			const user = await this.manager.getUserFromDb(db, userId);
			if (!user) {
				return reply.status(404).send({ error: "User not found" });
			}
			const otp = await this.manager.generateAndStoreOtp(db, userId);
			await sendOtpEmail(user.email, otp);
			return reply.send({ success: true });
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async verify2fa(
		req: FastifyRequest,
		reply: FastifyReply,
		db: sqlite3.Database,
		userId: number
	) {
		const { otp } = req.body as { otp: string };
		try {
			const valid = await this.manager.verifyOtp(db, userId, otp);
			if (!valid) {
				return reply.status(400).send({ error: "Invalid or expired code" });
			}
			await this.manager.set2faEnabled(db, userId, true);
			return reply.send({ success: true });
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async loginUser(
		req: FastifyRequest<{ Body: LoginUserBody }>,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		try {
			const user = await this.manager.loginUserToDb(db, req.body);
			if (user.is2faEnabled) {
				const otp = await this.manager.generateAndStoreOtp(db, user.id);
				await sendOtpEmail(user.email, otp);
				return reply.send({ require2fa: true, message: "2FA code sent to your email." });
			}
			const token = jwt.sign(
				{ id: user.id, userName: user.userName },
				JWT_SECRET,
				{ expiresIn: '1h' }
			);
			const { password, ...publicUser } = user;
			return reply.send({ token, user: publicUser });
		} catch (err: any) {
			return reply.status(404).send({ error: err.message });
		}
	}

	async login2fa(
		req: FastifyRequest,
		reply: FastifyReply,
		db: sqlite3.Database
	) {
		const { userName, otp } = req.body as { userName: string; otp: string };
		try {
			const user = await this.manager.getUserByUserName(db, userName);
			if (!user || !user.is2faEnabled) {
				return reply.status(401).send({ error: "User not found or 2FA not enabled" });
			}

			const valid = await this.manager.verifyOtp(db, user.id, otp);
			if (!valid) {
				return reply.status(401).send({ error: "Invalid or expired code" });
			}

			const token = jwt.sign(
				{ id: user.id, userName: user.userName },
				JWT_SECRET,
				{ expiresIn: '1h' }
			);
			const { password, ...publicUser } = user;

			return reply.send({ token, user: publicUser });
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	}

	async updateDisplayName(
		req: FastifyRequest,
		reply: FastifyReply,
		db: sqlite3.Database,
		userId: number
	) {
		const { displayName } = req.body as { displayName: string };
		try {
			await this.manager.fieldExists(db, 'displayName', displayName);
			await this.manager.updateDisplayNameInDb(db, userId, displayName);

			return reply.send({ success: true, displayName });
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	}

	async updatePassword(
		req: FastifyRequest,
		reply: FastifyReply,
		db: sqlite3.Database,
		userId: number
	) {
		const { password, newPassword } = req.body as { password: string, newPassword: string };
		try {
			const user = await this.manager.getUserFromDb(db, userId);
			if (!user) {
				return reply.status(404).send({ error: "User not found" });
			}
			const isValid = await validatePassword(password, user.password);
			if (!isValid) {
				return reply.status(403).send({ error: "Invalid password" });
			}

			await this.manager.updatePasswordInDb(db, userId, newPassword);

			return reply.send({ success: true });
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	}

	async uploadProfilePicture(
		req: FastifyRequest,
		reply: FastifyReply,
		db: sqlite3.Database,
		userId: number
	) {
		try {
			const pump = promisify(pipeline);
			let uploadedFilename: string | null = null;

			
			const parts = req.parts();

			for await (const part of parts) {
				if (part.type === 'file') {
					
					const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
					if (!allowedMimeTypes.includes(part.mimetype)) {
						throw new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.');
					}

					const uploadDir = './data/avatars';
					if (!fs.existsSync(uploadDir)) {
						fs.mkdirSync(uploadDir, { recursive: true });
					}

					const filename = `user_${userId}_${Date.now()}_${part.filename}`;
					const filepath = `${uploadDir}/${filename}`;

					req.log.info(`Uploading file: ${filename}`);

					
					try {
						await pump(part.file, fs.createWriteStream(filepath));
						uploadedFilename = filename;
						req.log.info(`File uploaded successfully: ${filename}`);
					} catch (streamError: any) {
						req.log.error(`Stream error: ${streamError.message}`);
						
						if (fs.existsSync(filepath)) {
							fs.unlinkSync(filepath);
						}
						throw streamError;
					}

					
					break;
				} else {
					
					await part.value;
				}
			}

			if (!uploadedFilename) {
				return reply.status(400).send({ error: 'No avatar file provided' });
			}

			
			await this.manager.addProfilePictureToDb(db, userId, uploadedFilename);

			return reply.send({ success: true, filename: uploadedFilename });
		} catch (err: any) {
			req.log.error({ err }, 'Upload error');

			
			if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
				return reply.status(400).send({ error: 'Upload interrupted. Please try again with a smaller file or better connection.' });
			}

			if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
				return reply.status(413).send({ error: 'File too large. Maximum size is 10MB.' });
			}

			return reply.status(500).send({ error: 'Failed to upload file: ' + err.message });
		}
	}
}
