export class PongManager {
	constructor(private db: any) {}

	async saveMatchToHistory(player1Id: number, player2Id: number, result: string) {
		const sql = `
			INSERT INTO match_history (player1Id, player2Id, result)
			VALUES (?, ?, ?)
		`;
		return new Promise<void>((resolve, reject) => {
			this.db.run(sql, [player1Id, player2Id, result], (err: Error | null) => {
				if (err) {
					console.error("Failed to save match history:", err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}
