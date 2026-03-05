export interface PowerUp {
	id: string;
	type: PowerUpType;
	x: number;
	y: number;
	width: number;
	height: number;
	active: boolean;
	spawnTime: number;
}

export enum PowerUpType {
	BIG_PADDLE = 'big_paddle',
	SHIELD = 'shield'
}

export interface ActiveEffect {
	type: PowerUpType;
	playerId: number;
	endTime: number;
	originalValue?: any;
}

export interface PowerUpSettings {
	bigPaddle: boolean;
	shield: boolean;
	spawnRate: number;
}
