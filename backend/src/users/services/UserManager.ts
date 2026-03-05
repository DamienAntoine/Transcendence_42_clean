import * as sqlite3 from 'sqlite3';
import { RegisterUserBody } from '../userModels/RegisterUserBody';
import { LoginUserBody } from '../userModels/LoginUserBody';
import { UserLeaderboardRow } from '../userModels/UserLeaderboardRow';
import { UserDbRow } from '../userModels/UserDbRow';
import { hashPassword, validatePassword } from '../../services/PasswordHasher';
import { GameHistory } from '../userModels/GameHistory';

export class UserManager {
	private db: sqlite3.Database;

	constructor(db: sqlite3.Database) {
		this.db = db;
	}

	async getUserFromDb(
		db: sqlite3.Database,
		id: number
	): Promise<UserDbRow> {
		return new Promise((resolve, reject) => {
			db.get("SELECT * FROM user WHERE id = ?", [id], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row as UserDbRow);
				}
			});
		});
	}

	async getUserSortedByEloFromDb(
		db: sqlite3.Database,
	): Promise<UserLeaderboardRow[]> {
		return new Promise(async (resolve, reject) => {
			db.all("SELECT id as userId, displayName, avatar, elo FROM user ORDER BY elo DESC LIMIT 100", async (err: Error | null, rows: any[]) => {
				if (err) {
					reject(err);
				} else {
					
					const leaderboard = await Promise.all(
						rows.map(async (row) => {
							const stats = await this.getUserStatsFromDb(db, row.userId);
							return {
								userId: row.userId,
								displayName: row.displayName,
								avatar: row.avatar,
								elo: row.elo,
								wins: stats.wins,
								losses: stats.losses,
								gamesPlayed: stats.gamesPlayed
							};
						})
					);
					resolve(leaderboard);
				}
			});
		});
	}

	async getMatchHistoryByUserId(
		db: sqlite3.Database,
		userId: number
	): Promise<any[]> {
		return new Promise((resolve, reject) => {
			db.all(
				`SELECT
					mh.id as matchId,
					mh.player1Id,
					mh.player2Id,
					mh.result,
					mh.date,
					u1.displayName as player1DisplayName,
					u2.displayName as player2DisplayName
				FROM match_history mh
				LEFT JOIN user u1 ON mh.player1Id = u1.id
				LEFT JOIN user u2 ON mh.player2Id = u2.id
				WHERE mh.player1Id = ? OR mh.player2Id = ?
				ORDER BY mh.date DESC`,
				[userId, userId],
				(err: Error | null, rows: any[]) => {
					if (err) {
						reject(err);
					} else {
						
						const formattedRows = rows.map((row: any) => {
							const [score1, score2] = row.result.split('-').map(Number);
							const winnerId = score1 > score2 ? row.player1Id : row.player2Id;

							return {
								id: row.matchId,
								player1Id: row.player1Id,
								player1DisplayName: row.player1DisplayName,
								player2Id: row.player2Id,
								player2DisplayName: row.player2DisplayName,
								player1Score: score1,
								player2Score: score2,
								winnerId: winnerId,
								startedAt: row.date,
								finishedAt: row.date,
								duration: 0
							};
						});
						resolve(formattedRows);
					}
				}
			);
		});
	}

	async getUserStatsFromDb(
		db: sqlite3.Database,
		userId: number
	): Promise<{ wins: number; losses: number; gamesPlayed: number }> {
		return new Promise((resolve, reject) => {
			db.all(
				`SELECT player1Id, player2Id, result
				FROM match_history
				WHERE player1Id = ? OR player2Id = ?`,
				[userId, userId],
				(err: Error | null, rows: any[]) => {
					if (err) {
						reject(err);
					} else {
						let wins = 0;
						let losses = 0;

						rows.forEach((row: any) => {
							const [score1, score2] = row.result.split('-').map(Number);

							if (row.player1Id === userId) {
								
								if (score1 > score2) wins++;
								else losses++;
							} else {
								
								if (score2 > score1) wins++;
								else losses++;
							}
						});

						resolve({
							wins,
							losses,
							gamesPlayed: wins + losses
						});
					}
				}
			);
		});
	}

	async registerUserToDb(
		db: sqlite3.Database,
		userBody: RegisterUserBody
	): Promise<any> {
		const { userName, displayName, password, email } = userBody;
		const sql = "INSERT INTO user (userName, displayName, password, email) VALUES (?, ?, ?, ?)";
		const hashedPassword = await hashPassword(password);

		return new Promise((resolve, reject) => {
			db.run(sql, [userName, displayName, hashedPassword, email], function (err) {
				if (err) {
					reject(err);
				} else {
					resolve({ id: this.lastID, userName, displayName });
				}
			});
		});
	}

	async generateAndStoreOtp(db: sqlite3.Database, userId: number): Promise<string> {
		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

		return new Promise((resolve, reject) => {
			db.run(
				`INSERT OR REPLACE INTO user_otp (user_id, otp, expires_at) VALUES (?, ?, ?)`,
				[userId, otp, expiresAt],
				function (err) {
					if (err) {
						reject(err);
					} else {
						resolve(otp);
					}
				}
			)
		});
	}

	async verifyOtp(db: sqlite3.Database, userId: number, otp: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			db.get(
				'SELECT otp, expires_at FROM user_otp WHERE user_id = ?',
				[userId],
				(err, row: { otp: string; expires_at: string } | undefined) => {
					if (err || !row) {
						return resolve(false);
					}
					if (row.otp !== otp) {
						return resolve(false);
					}
					if (new Date(row.expires_at) < new Date()) {
						return resolve(false);
					}

					db.run('DELETE FROM user_otp WHERE user_id = ?', [userId]);
					resolve(true);
				}
			);
		});
	}

	async set2faEnabled(db: sqlite3.Database, userId: number, enabled: boolean): Promise<void> {
		return new Promise((resolve, reject) => {
			db.run(
				'UPDATE user SET is2faEnabled = ? WHERE id = ?',
				[enabled ? 1 : 0, userId],
				function (err) {
					if (err) reject(err);
					else resolve();
				}
			);
		});
	}

	async loginUserToDb(
		db: sqlite3.Database,
		userBody: LoginUserBody
	): Promise<UserDbRow> {
		const { userName, password } = userBody;
		const sql = "SELECT * FROM user WHERE userName = ?";
		return new Promise((resolve, reject) => {
			db.get(sql, [userName], async (err, row) => {
				if (err) {
					reject(err);
				} else if (!row) {
					reject(new Error("Invalid username or password"));
				} else {
					const userRow = row as UserDbRow;
					const isValid = await validatePassword(password, userRow.password);
					if (!isValid) {
						reject(new Error("Invalid username or password"));
					} else {
						resolve(userRow);
					}
				}
			});
		});
	}

	async getUserByUserName(db: sqlite3.Database, userName: string): Promise<UserDbRow | undefined> {
		return new Promise((resolve, reject) => {
			db.get(
				'SELECT * FROM user WHERE userName = ?',
				[userName],
				(err, row) => {
					if (err) return reject(err);
					resolve(row as UserDbRow | undefined);
				}
			);
		});
	}

	async fieldExists(
		db: sqlite3.Database,
		field: 'userName' | 'displayName' | 'email',
		value: string
	): Promise<void> {
		const sql = `SELECT * FROM user WHERE ${field} = ?`;
		return new Promise((resolve, reject) => {
			db.get(sql, [value], function (err, row) {
				if (row) {
					reject(new Error(`${field} already in use`));
				} else {
					resolve();
				}
			});
		});
	}

	async updateDisplayNameInDb(db: sqlite3.Database, userId: number, displayName: string) {
		return new Promise((resolve, reject) => {
			db.run(
				'UPDATE user SET displayName = ? WHERE id = ?',
				[displayName, userId],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(true);
				}
			);
		});
	}

	async updatePasswordInDb(db: sqlite3.Database, userId: number, newPassword: string) {
		const hashedPassword = await hashPassword(newPassword);

		return new Promise((resolve, reject) => {
			db.run(
				'UPDATE user SET password = ? WHERE id = ?',
				[hashedPassword, userId],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(true);
				}
			);
		});
	}

	async addProfilePictureToDb(
		db: sqlite3.Database,
		userId: number,
		avatar: string
	): Promise<void> {
		const sql = `UPDATE user SET avatar = ? WHERE id = ?`;
		return new Promise((resolve, reject) => {
			db.run(sql, [avatar, userId], function (err) {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}
