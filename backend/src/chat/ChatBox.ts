import { WebSocket } from 'ws';

export class ChatBox {
	roomId: string;
	clients: Set<WebSocket>;

	constructor(roomId: string) {
		this.roomId = roomId;
		this.clients = new Set();
	}

	addClient(client: any) {
		this.clients.add(client);
	}

	removeClient(client: any) {
		this.clients.delete(client);
	}

	isEmpty(): boolean {
		return this.clients.size === 0;
	}

	dispose(): void {
		this.clients.clear();
	}

	broadcast(message: any) {
		for (const client of this.clients) {
			client.send(JSON.stringify(message));
		}
	}
}
