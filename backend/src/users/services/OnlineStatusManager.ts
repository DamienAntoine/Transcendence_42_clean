import { EventEmitter } from 'events';

export class OnlineStatusManager extends EventEmitter {
	private onlineUsers = new Set<number>();

	setOnline(userId: number) {
		const wasOnline = this.onlineUsers.has(userId);
		this.onlineUsers.add(userId);

		if (!wasOnline) {
			this.emit('statusChanged', { userId, isOnline: true });
		}
	}

	setOffline(userId: number) {
		const wasOnline = this.onlineUsers.has(userId);
		this.onlineUsers.delete(userId);

		if (wasOnline) {
			this.emit('statusChanged', { userId, isOnline: false });
		}
	}

	isOnline(userId: number): boolean {
		return this.onlineUsers.has(userId);
	}

	getOnlineStatus(userIds: number[]): Record<number, boolean> {
		const status: Record<number, boolean> = {};
		for (const id of userIds) {
			status[id] = this.isOnline(id);
		}
		return status;
	}

	getOnlineUsers(): number[] {
		return Array.from(this.onlineUsers);
	}
}


export const onlineStatusManager = new OnlineStatusManager();
