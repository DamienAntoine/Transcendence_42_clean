import type sqlite3 from 'sqlite3';
import { SaveDmResult, DmMessage } from './ChatTypes';

export class ChatStore {
	constructor(private db: sqlite3.Database) {}

	async saveDmMessage(userId: number, peerId: number, content: string): Promise<SaveDmResult> {
		if (!Number.isInteger(userId) || userId <= 0) {
			throw new Error('Invalid userId');
		}
		if (!Number.isInteger(peerId) || peerId <= 0) {
			throw new Error('Invalid peerId');
		}
		if (userId === peerId) {
			throw new Error('Cannot DM yourself');
		}
		const msg = (content ?? '').trim();
		if (!msg) {
			throw new Error('Empty message');
		}
		if (msg.length > 4096) {
			throw new Error('Message too long');
		}
		if (await this.isBlocked(userId, peerId)) {
			throw new Error('User is blocked');
		}

		const a = Math.min(peerId, userId);
		const b = Math.max(peerId, userId);

		const insertedId = await new Promise<number>((resolve, reject) => {
			this.db.run(
				'INSERT INTO dm_messages (user_a_id, user_b_id, sender_id, content) VALUES (?, ?, ?, ?)',
				[a, b, userId, msg],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.lastID);
				}
			);
		});

		const createdAt = await new Promise<string>((resolve, reject) => {
			this.db.get(
				'SELECT created_at AS createdAt FROM dm_messages WHERE id = ?',
				[insertedId],
				(err, row: any) => {
					if (err) {
						return reject(err);
					}
					resolve(row?.createdAt as string);
				}
			);
		});

		return { id: insertedId, createdAt, a, b };
	}

	async listDmMessages(
		userId: number,
		peerId: number,
		{ limit, beforeId }: { limit: number; beforeId?: number }
	): Promise<DmMessage[]> {
		if (!Number.isInteger(userId) || userId <= 0) {
			throw new Error('Invalid userId');
		}
		if (!Number.isInteger(peerId) || peerId <= 0) {
			throw new Error('Invalid peerId');
		}
		if (userId === peerId) {
			throw new Error('Cannot DM yourself');
		}
		if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
			throw new Error('Invalid limit');
		}
		if (beforeId !== undefined && (!Number.isInteger(beforeId) || beforeId <= 0)) {
			throw new Error('Invalid beforeId');
		}

		const a = Math.min(peerId, userId);
		const b = Math.max(peerId, userId);

		let sql = `
		SELECT id, sender_id AS senderId, content AS message, created_at AS createdAt
		FROM dm_messages
		WHERE user_a_id = ? AND user_b_id = ?
		`;
		const params: any[] = [a, b];

		if (beforeId !== undefined) {
			sql += ' AND id < ?';
			params.push(beforeId);
		}

		sql += ` ORDER BY id DESC LIMIT ?`;
		params.push(limit);

		const rows = await new Promise<DmMessage[]>((resolve, reject) => {
			this.db.all(sql, params, (err, res) => {
				if (err) {
					return reject(err);
				}
				resolve((res as DmMessage[]) || []);
			});
		});
		return rows.reverse();
	}

	async getLastRead(userId: number, peerId: number): Promise<number> {
		if (!Number.isInteger(userId) || userId <= 0) {
			throw new Error('Invalid userId');
		}
		if (!Number.isInteger(peerId) || peerId <= 0) {
			throw new Error('Invalid peerId');
		}
		if (userId === peerId) {
			throw new Error('Cannot DM yourself');
		}

		let sql = `
		SELECT last_read_message_id AS lastReadId
		FROM dm_read_state
		WHERE user_id = ? AND peer_id = ?
		LIMIT 1
		`;
		const params = [userId, peerId];

		const lastRead = await new Promise<number>((resolve, reject) => {
			this.db.get(sql, params, (err, row: any) => {
				if (err) {
					return reject(err);
				}
				resolve(row?.lastReadId ?? 0);
			});
		});
		return lastRead;
	}

	async setLastRead(userId: number, peerId: number, lastReadId: number): Promise<boolean> {
		if (!Number.isInteger(userId) || userId <= 0) {
			throw new Error('Invalid userId');
		}
		if (!Number.isInteger(peerId) || peerId <= 0) {
			throw new Error('Invalid peerId');
		}
		if (userId === peerId) {
			throw new Error('Cannot DM yourself');
		}
		if (!Number.isInteger(lastReadId) || lastReadId < 0) {
			throw new Error('Invalid lastReadId');
		}

		if (lastReadId > 0) {
			const a = Math.min(userId, peerId);
			const b = Math.max(userId, peerId);
			const belongs = await new Promise<boolean>((resolve, reject) => {
				this.db.get(
					`SELECT 1 FROM dm_messages WHERE id = ? AND user_a_id = ? AND user_b_id = ? LIMIT 1`,
					[lastReadId, a, b],
					(err, row) => (err ? reject(err) : resolve(!!row))
				);
			});
			if (!belongs) {
				throw new Error('Message does not belong to this conversation');
			}
		}

		const insertChanges = await new Promise<number>((resolve, reject) => {
			this.db.run(
				`INSERT OR IGNORE INTO dm_read_state (user_id, peer_id, last_read_message_id, updated_at)
				 VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
				[userId, peerId, lastReadId],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes || 0);
				}
			);
		});

		const updateChanges = await new Promise<number>((resolve, reject) => {
			this.db.run(
				`UPDATE dm_read_state
				 SET last_read_message_id = ?, updated_at = CURRENT_TIMESTAMP
				 WHERE user_id = ? AND peer_id = ? AND last_read_message_id < ?`,
				[lastReadId, userId, peerId, lastReadId],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes || 0);
				}
			);
		});

		return (insertChanges + updateChanges) > 0;
	}

	async countUnreadForPeer(userId: number, peerId: number): Promise<number> {
		if (!Number.isInteger(userId) || userId <= 0) throw new Error('Invalid userId');
		if (!Number.isInteger(peerId) || peerId <= 0) throw new Error('Invalid peerId');
		if (userId === peerId) throw new Error('Cannot DM yourself');

		const lastReadId = await this.getLastRead(userId, peerId);

		const a = Math.min(userId, peerId);
		const b = Math.max(userId, peerId);

		const sql = `
		SELECT COUNT(*) AS unreadCount
		FROM dm_messages
		WHERE user_a_id = ? AND user_b_id = ?
			AND sender_id = ?
			AND id > ?
		`;
		const params = [a, b, peerId, lastReadId];

		const unread = await new Promise<number>((resolve, reject) => {
			this.db.get(sql, params, (err, row: any) => {
				if (err) {
					return reject(err);
				}
				resolve((row?.unreadCount as number) ?? 0);
			});
		});

		return unread;
	}

	async summaryUnread(userId: number): Promise<Array<{ peerId: number; unreadCount: number; lastMessage: string | null; lastMessageAt: string | null }>> {
		if (!Number.isInteger(userId) || userId <= 0) {
			throw new Error('Invalid userId');
		}

		const peersRows = await new Promise<Array<{ peerId: number }>>((resolve, reject) => {
			this.db.all(
				`
				SELECT DISTINCT peerId FROM (
				SELECT CASE WHEN user_a_id = ? THEN user_b_id ELSE user_a_id END AS peerId
				FROM dm_messages
				WHERE user_a_id = ? OR user_b_id = ?
				UNION
				SELECT peer_id AS peerId
				FROM dm_read_state
				WHERE user_id = ?
				)
				`,
				[userId, userId, userId, userId],
				(err, rows) => (err ? reject(err) : resolve((rows as any[]) || []))
			);
		});

		const results: Array<{ peerId: number; unreadCount: number; lastMessage: string | null; lastMessageAt: string | null }> = [];
		for (const row of peersRows) {
			const peerId = row.peerId;
			if (!Number.isInteger(peerId) || peerId === userId) {
				continue;
			}

			const [unreadCount, lastMsg] = await Promise.all([
				this.countUnreadForPeer(userId, peerId),
				new Promise<{ lastMessage: string | null; lastMessageAt: string | null }>((resolve, reject) => {
					const a = Math.min(userId, peerId);
					const b = Math.max(userId, peerId);
					this.db.get(
						`
						SELECT content AS lastMessage, created_at AS lastMessageAt
						FROM dm_messages
						WHERE user_a_id = ? AND user_b_id = ?
						ORDER BY id DESC
						LIMIT 1
						`,
						[a, b],
						(err, r: any) => (err ? reject(err) : resolve({ lastMessage: r?.lastMessage ?? null, lastMessageAt: r?.lastMessageAt ?? null }))
					);
				}),
			]);

			results.push({ peerId, unreadCount, lastMessage: lastMsg.lastMessage, lastMessageAt: lastMsg.lastMessageAt });
		}

		results.sort((x, y) => (y.lastMessageAt ?? '').localeCompare(x.lastMessageAt ?? ''));

		return results;
	}

	async blockUser(userId: number, peerId: number): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			this.db.run(
				`
				INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id)
				VALUES (?, ?)
				`,
				[userId, peerId],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes > 0);
				}
			);
		});
	}

	async unblockUser(userId: number, peerId: number): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			this.db.run(
				`
				DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?
				`,
				[userId, peerId],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes > 0);
				}
			);
		});
	}

	async isBlocked(userId: number, peerId: number): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			this.db.get(
				`SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
				[userId, peerId, peerId, userId],
				function (err, row) {
					if (err) {
						return reject(err);
					}
					resolve(!!row);
				}
			);
		});
	}

	async hasBlocked(blockerId: number, blockedId: number): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			this.db.get(
				`SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?`,
				[blockerId, blockedId],
				function (err, row) {
					if (err) {
						return reject(err);
					}
					resolve(!!row);
				}
			);
		});
	}

	async getFriendsList(userId: number): Promise<number[]> {
		return new Promise<number[]>((resolve, reject) => {
			this.db.all(
				`
				SELECT CASE WHEN user_1 = ? THEN user_2 ELSE user_1 END AS friendId
				FROM friendslist
				WHERE user_1 = ? OR user_2 = ?
				`,
				[userId, userId, userId],
				(err, rows: Array<{ friendId: number }> | undefined) => {
					if (err) {
						return reject(err);
					}
					resolve((rows ?? []).map(r => r.friendId));
				}
			);
		});
	}

	async requestFriend(userId: number, receiverId: number): Promise<boolean> {

		if (userId === receiverId) {
			throw new Error('Cannot send friend request to yourself');
		}


		const friends = await this.getFriendsList(userId);
		if (friends.includes(receiverId)) {
			throw new Error('Already friends');
		}

		// Check if there's already a pending request from the other user
		const hasPendingFromReceiver = await new Promise<boolean>((resolve, reject) => {
			this.db.get(
				`SELECT status FROM friend_requests WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'`,
				[receiverId, userId],
				function (err, row: { status?: string } | undefined) {
					if (err) {
						return reject(err);
					}
					resolve(!!row);
				}
			);
		});

		// If the receiver already sent a request, automatically accept it and create friendship
		if (hasPendingFromReceiver) {
			console.log(`🤝 User ${userId} is accepting existing request from ${receiverId} automatically`);
			await this.acceptFriendRequest(receiverId, userId);
			return true;
		}

		return new Promise<boolean>((resolve, reject) => {
			this.db.run(
				`
				INSERT INTO friend_requests (requester_id, receiver_id, status, requested_at)
				VALUES(?, ?, 'pending', CURRENT_TIMESTAMP)
				ON CONFLICT(requester_id, receiver_id)
				DO UPDATE SET status = 'pending', requested_at = CURRENT_TIMESTAMP
				`,
				[userId, receiverId],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(true);
				}
			);
		});
	}

	async acceptFriendRequest(requesterId: number, receiverId: number): Promise<boolean> {
		const self = this;

		const isPending = await new Promise<boolean>((resolve, reject) => {
			this.db.get(
				`SELECT status FROM friend_requests WHERE requester_id = ? AND receiver_id = ?`,
				[requesterId, receiverId],
				function (err, row: { status?: string } | undefined) {
					if (err) {
						return reject(err);
					}
					if (!row || row.status !== 'pending') {
						return resolve(false);
					}

					resolve(true);
				}
			);
		});

		if (!isPending) {
			throw new Error('Friend request does not exist')
		}

		// Check if there's a mutual pending request (receiver also sent a request to requester)
		const hasMutualRequest = await new Promise<boolean>((resolve, reject) => {
			this.db.get(
				`SELECT status FROM friend_requests WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'`,
				[receiverId, requesterId],
				function (err, row: { status?: string } | undefined) {
					if (err) {
						return reject(err);
					}
					resolve(!!row);
				}
			);
		});

		return new Promise<boolean>((resolve, reject) => {
			// Update the accepted request
			this.db.run(
				`UPDATE friend_requests SET status = 'accepted' WHERE requester_id = ? AND receiver_id = ?`,
				[requesterId, receiverId],
				function (err) {
					if (err) {
						return reject(err);
					}

					// If there's a mutual request, also mark it as accepted
					if (hasMutualRequest) {
						self.db.run(
							`UPDATE friend_requests SET status = 'accepted' WHERE requester_id = ? AND receiver_id = ?`,
							[receiverId, requesterId],
							function (mutualErr) {
								if (mutualErr) {
									console.error('Failed to update mutual request:', mutualErr);
								} else {
									console.log(`✅ Mutual friend request also marked as accepted`);
								}
							}
						);
					}

					self.addFriend(requesterId, receiverId).then(() => {
						resolve(this.changes > 0);
					}).catch(reject);
				}
			);
		});
	}

	async rejectFriendRequest(requesterId: number, receiverId: number): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			this.db.run(
				`DELETE FROM friend_requests WHERE requester_id = ? AND receiver_id = ?`,
				[requesterId, receiverId],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes > 0);
				}
			)
		});
	}

	async addFriend(userId: number, peerId: number): Promise<boolean> {
		let minUser = Math.min(userId, peerId);
		let maxUser = Math.max(userId, peerId);

		return new Promise<boolean>((resolve, reject) => {
			this.db.run(
				`
				INSERT OR IGNORE INTO friendslist (user_1, user_2)
				VALUES (?, ?)
				`,
				[minUser, maxUser],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes > 0);
				}
			);
		});
	}

	async deleteFriend(userId: number, peerId: number): Promise<boolean> {
		let minUser = Math.min(userId, peerId);
		let maxUser = Math.max(userId, peerId);

		return new Promise<boolean>((resolve, reject) => {
			this.db.run(
				`
				DELETE FROM friendslist WHERE user_1 = ? AND user_2 = ?
				`,
				[minUser, maxUser],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes > 0);
				}
			);
		});
	}

	async getPendingReceivedRequests(userId: number): Promise<number[]> {
		return new Promise<number[]>((resolve, reject) => {
			this.db.all(
				`
				SELECT requester_id AS requesterId
				FROM friend_requests
				WHERE receiver_id = ? AND status = 'pending'
				`,
				[userId],
				(err, rows: Array<{ requesterId: number }> | undefined) => {
					if (err) {
						return reject(err);
					}
					resolve((rows ?? []).map(r => r.requesterId));
				}
			);
		});
	}

	async getPendingSentRequests(userId: number): Promise<number[]> {
		return new Promise<number[]>((resolve, reject) => {
			this.db.all(
				`
				SELECT receiver_id AS receiverId
				FROM friend_requests
				WHERE requester_id = ? AND status = 'pending'
				`,
				[userId],
				(err, rows: Array<{ receiverId: number }> | undefined) => {
					if (err) {
						return reject(err);
					}
					resolve((rows ?? []).map(r => r.receiverId));
				}
			);
		});
	}

	async cancelFriendRequest(requesterId: number, receiverId: number): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			this.db.run(
				`DELETE FROM friend_requests WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'`,
				[requesterId, receiverId],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes > 0);
				}
			)
		});
	}

	async saveGlobalChatMessage(senderId: number, senderName: string, content: string): Promise<{ id: number; createdAt: string }> {
		if (!Number.isInteger(senderId) || senderId <= 0) {
			throw new Error('Invalid senderId');
		}
		const msg = (content ?? '').trim();
		if (!msg) {
			throw new Error('Empty message');
		}
		if (msg.length > 4096) {
			throw new Error('Message too long');
		}

		const insertedId = await new Promise<number>((resolve, reject) => {
			this.db.run(
				'INSERT INTO global_chat_messages (sender_id, sender_name, content) VALUES (?, ?, ?)',
				[senderId, senderName, msg],
				function (err) {
					if (err) {
						return reject(err);
					}
					resolve(this.lastID);
				}
			);
		});

		const createdAt = await new Promise<string>((resolve, reject) => {
			this.db.get(
				'SELECT created_at AS createdAt FROM global_chat_messages WHERE id = ?',
				[insertedId],
				(err, row: any) => {
					if (err) {
						return reject(err);
					}
					resolve(row?.createdAt as string);
				}
			);
		});

		return { id: insertedId, createdAt };
	}

	async listGlobalChatMessages(limit: number = 50): Promise<Array<{ id: number; senderId: number; senderName: string; content: string; createdAt: string }>> {
		if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
			throw new Error('Invalid limit');
		}

		return new Promise<Array<{ id: number; senderId: number; senderName: string; content: string; createdAt: string }>>((resolve, reject) => {
			this.db.all(
				`
				SELECT id, sender_id AS senderId, sender_name AS senderName, content, created_at AS createdAt
				FROM global_chat_messages
				ORDER BY id DESC
				LIMIT ?
				`,
				[limit],
				(err, rows: any) => {
					if (err) {
						return reject(err);
					}
					resolve((rows || []).reverse());
				}
			);
		});
	}
}
