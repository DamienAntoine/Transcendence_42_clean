import * as sqlite3 from 'sqlite3';
import { GameParams } from './gameModels/GameParams';

export class GameManager {
	private db: sqlite3.Database;

	constructor(db: sqlite3.Database) {
		this.db = db;
	}

	async createMatchToDb(
		db: sqlite3.Database,
		matchBody: GameParams
	): Promise<any> {
		const { player1Id, player2Id } = matchBody;
		const sql = "INSERT INTO game (player1Id, player2Id, status) VALUES (?, ?, ?)";

		return new Promise((resolve, reject) => {
			db.run(sql, [player1Id, player2Id, 'waiting'], function (err) {
				if (err) {
					reject(err);
				} else {
					resolve({ id: this.lastID, player1Id, player2Id, status: 'waiting' });
				}
			});
		});
	}

	async getMatchInfoFromDb(
		db: sqlite3.Database,
		id: number
	): Promise<any> {
		return new Promise((resolve, reject) => {
			db.get("SELECT * FROM game WHERE id = ?", [id], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row);
				}
			});
		});
	}

	calculateElo(playerOneElo: number, playerTwoElo: number, result: 0 | 1): number {
		const K = 32;
		const expected = 1 / (1 + Math.pow(10, (playerTwoElo - playerOneElo) / 400));
		return Math.round(playerOneElo + K * (result - expected));
	}

	async updateEloAfterMatch(
		db: sqlite3.Database,
		player1Id: number,
		player2Id: number,
		player1Score: number,
		player2Score: number
	): Promise<void> {
		const getUserElo = (id: number) =>
			new Promise<number>((resolve, reject) => {
				db.get("SELECT elo FROM user WHERE id = ?", [id], (err, row) => {
					if (err) reject(err);
					else resolve((row as { elo: number }).elo);
				});
			});

		const p1Elo = await getUserElo(player1Id);
		const p2Elo = await getUserElo(player2Id);

		const p1Result = player1Score > player2Score ? 1 : 0;
		const p2Result = player2Score > player1Score ? 1 : 0;

		const newP1Elo = this.calculateElo(p1Elo, p2Elo, p1Result as 0 | 1);
		const newP2Elo = this.calculateElo(p2Elo, p1Elo, p2Result as 0 | 1);

		await new Promise<void>((resolve, reject) => {
			db.run("UPDATE user SET elo = ? WHERE id = ?", [newP1Elo, player1Id], err => {
				if (err) reject(err); else resolve();
			});
		});
		await new Promise<void>((resolve, reject) => {
			db.run("UPDATE user SET elo = ? WHERE id = ?", [newP2Elo, player2Id], err => {
				if (err) reject(err); else resolve();
			});
		});
	}
}
