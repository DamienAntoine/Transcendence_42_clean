import { ChatBox } from './ChatBox';

export class ChatRoomManager {
	private rooms: Map<string, ChatBox>;

	constructor() {
		this.rooms = new Map();
	}

	getOrCreateRoom(roomId: string): ChatBox {
		if (!this.rooms.has(roomId)) {
			this.rooms.set(roomId, new ChatBox(roomId));
		}
		return this.rooms.get(roomId)!;
	}

	removeClientFromRoom(roomId: string, client: any) {
		const box = this.rooms.get(roomId);
		if (!box) {
			return;
		}
		box.removeClient(client);
		if (box.isEmpty()) {
			box.dispose();
			this.rooms.delete(roomId);
		}
	}

	removeClientFromAllRooms(client: any) {
		for (const [roomId, box] of this.rooms.entries()) {
			box.removeClient(client);
			if (box.isEmpty()) {
				box.dispose();
				this.rooms.delete(roomId);
			}
		}
	}
}
