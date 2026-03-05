

import { PowerUp, ActiveEffect } from './powerups/PowerUpTypes';

export interface PongGameState {
	ball: { x: number; y: number; vx: number; vy: number };
	paddles: { [playerId: number]: { y: number; height?: number } };
	scores: { [playerId: number]: number };
	status: 'waiting' | 'countdown' | 'playing' | 'finished';
	countdown: number;
	powerUps?: PowerUp[];
	activeEffects?: ActiveEffect[];
}

export type PongAction =
	| { type: 'MOVE_PADDLE'; playerId: number; direction: 'up' | 'down' }
	| { type: 'START_GAME' }
	| { type: 'END_GAME' };

export type PongField = {
	width: number;
	height: number;
	paddleHeight: number;
	paddleWidth: number;
	leftPaddleX: number;
	rightPaddleX: number;
	leftPaddleY: number;
	rightPaddleY: number;
	ballWidth: number;
}

export interface PongQuery {
	mode?: string;
	token?: string;
	winCondition?: string;
	custom_field?: string;
	fieldWidth?: string;
	fieldHeight?: string;
	paddleHeight: number;
	paddleWidth: number;
}

export interface QueuedPlayer {
	playerId: number;
	socket: any;
	elo: number;
	displayName: string;
	query: any;
	db: any;
	joinedAt: number;
}

export interface CustomMatchSettings {
	paddleSize: number;
	gameSpeed: number;
	powerups: {
		bigPaddle: boolean;
		shield: boolean;
	};
}

export interface CustomMatchInvitation {
	invitationId: string;
	hostId: number;
	hostName: string;
	guestId: number;
	settings: CustomMatchSettings;
	status: 'pending' | 'accepted' | 'rejected' | 'expired';
	createdAt: number;
}

export interface CustomMatchSettings {
	paddleSize: number;
	gameSpeed: number;
	powerups: {
		bigPaddle: boolean;
		shield: boolean;
	};
}

export interface CustomMatchInvitation {
	invitationId: string;
	hostId: number;
	hostName: string;
	guestId: number;
	settings: CustomMatchSettings;
	status: 'pending' | 'accepted' | 'rejected' | 'expired';
	createdAt: number;
}
