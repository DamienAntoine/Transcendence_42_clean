export type SaveDmResult = {
	id: number;
	createdAt: string;
	a: number;
	b: number;
};

export type DmMessage = {
	id: number;
	senderId: number;
	message: string;
	createdAt: string;
};
