import * as sqlite3 from 'sqlite3';

export function setupDatabase(db: sqlite3.Database) {
	db.serialize(() => {
		db.run(`
			CREATE TABLE IF NOT EXISTS user (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				userName TEXT NOT NULL,
				displayName TEXT NOT NULL,
				password TEXT NOT NULL,
				email TEXT NOT NULL,
				avatar TEXT DEFAULT NULL,
				elo INTEGER DEFAULT 1000,
				is2faEnabled BOOLEAN DEFAULT FALSE
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS user_otp (
				user_id INTEGER NOT NULL,
				otp TEXT NOT NULL,
				expires_at DATETIME NOT NULL,
				PRIMARY KEY (user_id),
				FOREIGN KEY(user_id) REFERENCES user(id)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS game (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				player1Id INTEGER NOT NULL,
				player2Id INTEGER NOT NULL,
				player1Score INTEGER DEFAULT 0,
				player2Score INTEGER DEFAULT 0,
				status TEXT NOT NULL,
				winnerId INTEGER,
				FOREIGN KEY(player1Id) REFERENCES user(id),
				FOREIGN KEY(player2Id) REFERENCES user(id),
				FOREIGN KEY(winnerId) REFERENCES user(id)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS match_history (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				player1Id INTEGER NOT NULL,
				player2Id INTEGER NOT NULL,
				result TEXT NOT NULL,
				date DATETIME DEFAULT (datetime('now', '+1 hour')),
				FOREIGN KEY(player1Id) REFERENCES user(id),
				FOREIGN KEY(player2Id) REFERENCES user(id)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS dm_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_a_id INTEGER NOT NULL,
			user_b_id INTEGER NOT NULL,
			sender_id INTEGER NOT NULL,
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`);

		db.run(`CREATE INDEX IF NOT EXISTS idx_dm_ab_created ON dm_messages(user_a_id, user_b_id, created_at)`);
		db.run(`CREATE INDEX IF NOT EXISTS idx_dm_ab_id ON dm_messages(user_a_id, user_b_id, id)`);

		db.run(`
			CREATE TABLE IF NOT EXISTS global_chat_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sender_id INTEGER NOT NULL,
			sender_name TEXT NOT NULL,
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(sender_id) REFERENCES user(id)
			)
		`);

		db.run(`CREATE INDEX IF NOT EXISTS idx_global_chat_created ON global_chat_messages(created_at)`);

		db.run(`
			CREATE TABLE IF NOT EXISTS dm_read_state (
			user_id INTEGER NOT NULL,
			peer_id INTEGER NOT NULL,
			last_read_message_id INTEGER DEFAULT 0,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (user_id, peer_id)
			)
		`);


		db.run(`
			CREATE TABLE IF NOT EXISTS friend_requests (
			requester_id INTEGER NOT NULL,
			receiver_id INTEGER NOT NULL,
			requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			status TEXT DEFAULT 'pending',
			PRIMARY KEY (requester_id, receiver_id)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS friendslist (
			user_1 INTEGER NOT NULL,
			user_2 INTEGER NOT NULL,
			added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (user_1, user_2),
			FOREIGN KEY(user_1) REFERENCES user(id),
			FOREIGN KEY(user_2) REFERENCES user(id)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS user_blocks(
			blocker_id INTEGER NOT NULL,
			blocked_id INTEGER NOT NULL,
			PRIMARY KEY (blocker_id, blocked_id),
			FOREIGN KEY(blocker_id) REFERENCES user(id),
			FOREIGN KEY(blocked_id) REFERENCES user(id)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS tournament(
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				start_time DATETIME,
				status TEXT DEFAULT 'pending',
				creator_id INTEGER,
				FOREIGN KEY(creator_id) REFERENCES user(id)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS tournament_participant(
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				tournament_id INTEGER NOT NULL,
				user_id INTEGER,
				displayname STRING NOT NULL,
				guest BOOLEAN DEFAULT 0,
				guest_token TEXT,
				FOREIGN KEY(tournament_id) REFERENCES tournament(id),
				FOREIGN KEY(user_id) REFERENCES user(id)
			)
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS tournament_match(
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				tournament_id INTEGER NOT NULL,
				round INTEGER NOT NULL,
				player1_id INTEGER,
				player2_id INTEGER,
				player1_participant_id INTEGER,
				player2_participant_id INTEGER,
				player1_name TEXT,
				player2_name TEXT,
				player1_score INTEGER,
				player2_score INTEGER,
				winner_id INTEGER,
				winner_participant_id INTEGER,
				game_id TEXT,
				status TEXT DEFAULT 'pending',
				FOREIGN KEY(tournament_id) REFERENCES tournament(id),
				FOREIGN KEY(player1_id) REFERENCES user(id),
				FOREIGN KEY(player2_id) REFERENCES user(id),
				FOREIGN KEY(winner_id) REFERENCES user(id)
			)
		`);


		const ensureColumn = (table: string, column: string, type: string, defaultSql?: string) => {
			db.all(`PRAGMA table_info(${table})`, (err: any, rows: any[]) => {
				if (err) {
					console.error('Failed to inspect table info for', table, err);
					return;
				}
				const hasColumn = rows?.some((r: any) => r.name === column);
				if (!hasColumn) {
					const alter = `ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultSql ? ` DEFAULT ${defaultSql}` : ''}`;
					db.run(alter, (e: any) => {
						if (e) console.error(`Failed to add column ${column} to ${table}:`, e);
					});
				}
			});
		};


		ensureColumn('tournament_match', 'game_id', 'TEXT');
		ensureColumn("tournament_match", "status", "TEXT", `'pending'`);


		ensureColumn('tournament_participant', 'guest', 'BOOLEAN', '0');
		ensureColumn('tournament_participant', 'guest_token', 'TEXT');


		ensureColumn('tournament_match', 'player1_participant_id', 'INTEGER');
		ensureColumn('tournament_match', 'player2_participant_id', 'INTEGER');
		ensureColumn('tournament_match', 'player1_name', 'TEXT');
		ensureColumn('tournament_match', 'player2_name', 'TEXT');
		ensureColumn('tournament_match', 'winner_participant_id', 'INTEGER');


		ensureColumn('user', 'isGuest', 'BOOLEAN', '0');


		ensureColumn('tournament', 'winner_id', 'INTEGER');
		ensureColumn('tournament', 'winner_displayname', 'TEXT');
	});
}
