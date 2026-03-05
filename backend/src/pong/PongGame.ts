import { WebSocket } from 'ws';
import { PongGameState, PongField } from './PongTypes';
import { PowerUp, PowerUpType, ActiveEffect, PowerUpSettings } from './powerups/PowerUpTypes';
import { PowerUpManager } from './powerups/PowerUpManager';

export const DEFAULT_WIN_CONDITION = 5;
export const DEFAULT_FIELD: PongField = {
	width: 100,
	height: 100,
	paddleWidth: 2,
	paddleHeight: 20,
	leftPaddleX: 2,
	rightPaddleX: 96,
	leftPaddleY: 50,
	rightPaddleY: 50,
	ballWidth: 2
};

const PADDLE_STEP = 5;
const RESET_COUNTDOWN = 3;

export class PongGame {
	matchId: string;
	clients: Set<WebSocket>;
	state: PongGameState;
	interval?: NodeJS.Timeout;
	playerIds: [number, number];
	playerNames: { [playerId: number]: string };
	onGameOver?: (game: PongGame, winnerId: number) => void;
	isLocal: boolean;
	powerUpManager: PowerUpManager;

	winCondition: number;
	field: PongField;
	gameSpeed: number;

	powerUps: PowerUp[] = [];
	activeEffects: ActiveEffect[] = [];
	lastPowerUpSpawn: number = 0;
	shields: { [playerId: number]: { active: boolean, endTime: number } } = {};
	powerUpSettings: PowerUpSettings;

	constructor(
		matchId: string,
		playerNames: { [ playerId: number]: string },
		options?: { winCondition?: number; field?: PongField; isLocal?: boolean; powerUpSettings?: PowerUpSettings; gameSpeed?: number }
	) {
		this.matchId = matchId;
		this.clients = new Set();
		this.winCondition = options?.winCondition ?? DEFAULT_WIN_CONDITION;
		this.field = options?.field ?? DEFAULT_FIELD;
		this.gameSpeed = options?.gameSpeed ?? 1.0;


		const baseSpeed = 0.5;
		this.state = {
			ball: { x: 50, y: 50, vx: baseSpeed * this.gameSpeed, vy: baseSpeed * this.gameSpeed},
			paddles: {},
			scores: {},
			status: 'waiting',
			countdown: 0
		};
		this.playerIds = [-1, -1];
		this.playerNames = playerNames;
		this.isLocal = options?.isLocal ?? false;
		this.powerUpSettings = options?.powerUpSettings ?? {
			bigPaddle: false,
			shield: false,
			spawnRate: 5
		}
		this.powerUpManager = new PowerUpManager(this);
	}

	addClient(client: WebSocket, playerId: number) {
		this.clients.add(client);
		this.state.paddles[playerId] = {
			y: 50,
			height: this.field.paddleHeight
		};
		this.state.scores[playerId] = 0;

		if (this.playerIds[0] === -1) {
			this.playerIds[0] = playerId;
		} else if (this.playerIds[1] === -1) {
			this.playerIds[1] = playerId;
		}

		for (const pid of this.playerIds) {
			if (pid !== -1) {
				client.send(JSON.stringify({
					type: 'PLAYER_JOINED',
					playerId: pid,
					displayName: this.playerNames[pid] || `Player ${pid}`
				}));
			}
		}

		this.broadcast({
			type: 'PLAYER_JOINED',
			playerId: playerId,
			displayName: this.playerNames[playerId] || `Player ${playerId}`
		});

		if (this.playerIds[0] !== -1 && this.playerIds[1] !== -1) {
			this.startGameLoop();
		}
	}

	removeClient(client: any) {
		this.clients.delete(client);
	}

	broadcast(message: any) {
		for (const client of this.clients) {
			client.send(JSON.stringify(message));
		}
	}

	startGameLoop() {
		this.state.status = 'countdown';
		this.state.countdown = RESET_COUNTDOWN;
		this.broadcast({ type: 'GAME_STATE', state: this.state });

		let countdown = RESET_COUNTDOWN;
		const countdownInterval = setInterval(() => {
			countdown -= 1;
			this.state.countdown = countdown;
			this.broadcast({ type: 'GAME_STATE', state: this.state });

			if (countdown <= 0) {
				clearInterval(countdownInterval);
				this.state.status = 'playing';
				this.state.countdown = 0;
				this.interval = setInterval(() => {
					this.updateGame();
					this.broadcast({ type: 'GAME_STATE', state: this.state });
				}, 1000 / 60);
			}
		}, 1000);
	}

	stopGameLoop() {
		if (this.interval) {
			clearInterval(this.interval);
		}
		this.state.status = 'finished';
	}

	resetGame(direction: "left" | "right" = "right") {
		const paddles: { [playerId: number]: { y: number; height?: number } } = {};

		for (const playerId of Object.keys(this.state.paddles)) {
			paddles[Number(playerId)] = {
				y: 50,
				height: this.field.paddleHeight
			};
		}

		if (this.interval) {
			clearInterval(this.interval);
		}


		this.powerUps = [];
		this.activeEffects = [];
		this.shields = {};


		const baseSpeed = 0.5;
		const vx = (direction === "right" ? 1 : -1) * baseSpeed * this.gameSpeed;
		let vy = (Math.random() * 2 - 1) * baseSpeed * this.gameSpeed;
		const minSpeed = 0.2 * this.gameSpeed;
		if (Math.abs(vy) < minSpeed) {
			vy = vy < 0 ? -minSpeed : minSpeed;
		}

		this.state = {
			ball: { x: 50, y: 50, vx, vy },
			paddles,
			scores: this.state.scores,
			status: 'countdown',
			countdown: RESET_COUNTDOWN
		};
		this.broadcast({ type: 'GAME_STATE', state: this.state });

		let countdown = RESET_COUNTDOWN;
		const countdownInterval = setInterval(() => {
			countdown -= 1;
			this.state.countdown = countdown;
			this.broadcast({ type: 'GAME_STATE', state: this.state });

			if (countdown <= 0) {
				clearInterval(countdownInterval);
				this.state.status = 'playing';
				this.state.countdown = 0;
				this.interval = setInterval(() => {
					this.updateGame();
					this.broadcast({ type: 'GAME_STATE', state: this.state });
				}, 1000 / 60);
			}
		}, 1000);
	}


	updateGame() {
		this.moveBall();

		if (this.powerUpSettings.bigPaddle || this.powerUpSettings.shield) {
			this.powerUpManager.updateActiveEffects();
			this.powerUpManager.checkPowerUpCollision();
			this.powerUpManager.spawnPowerUp();


			this.state.powerUps = this.powerUps;
			this.state.activeEffects = this.activeEffects;


			if (this.activeEffects.length > 0) {
				console.log('[BACKEND] activeEffects synced to state:', this.activeEffects);
			}


			for (const playerId of this.playerIds) {
				if (playerId !== -1 && this.state.paddles[playerId]) {
					this.state.paddles[playerId].height = this.powerUpManager.getPaddleHeight(playerId);
				}
			}
		}

		if (this.detectWallCollision()) {
			this.state.ball.vy *= -1;
		}

		if (this.detectPaddleCollision(this.playerIds[0], this.playerIds[1])) {

			this.increaseBallVelocity(0.3);
		}

		const scoringDirection = this.detectScoring(this.playerIds[0], this.playerIds[1])
			if (scoringDirection) {
				this.resetGame(scoringDirection);
		}

		const winnerId = this.checkWinCondition(this.playerIds[0], this.playerIds[1]);
		if (winnerId !== null) {
			this.state.status = 'finished';
			const winnerName = this.playerNames[winnerId] || `Player ${winnerId}`;
			this.broadcast({
				type: 'GAME_OVER',
				winnerId,
				winnerName,
				state: this.state
			});
			if (this.interval) {
				clearInterval(this.interval);
				this.interval = undefined;
			}

			if (this.onGameOver) {
				this.onGameOver(this, winnerId);
			}
		}
	}


	movePaddle(playerId: number, direction: string) {
		if (this.state.status !== 'playing') {
			return;
		}

		const paddle = this.state.paddles[playerId];
		if (!paddle) return;


		const paddleHeight = paddle.height ?? this.field.paddleHeight;

		if (direction === 'up') {
			paddle.y = Math.max(paddleHeight / 2, paddle.y - PADDLE_STEP);
		} else if (direction === 'down') {
			paddle.y = Math.min(this.field.height - paddleHeight / 2, paddle.y + PADDLE_STEP);
		}
	}


	moveBall() {
		this.state.ball.x += this.state.ball.vx;
		this.state.ball.y += this.state.ball.vy;
	}


	detectWallCollision(): boolean {
		const topEdge = this.state.ball.y - this.field.ballWidth / 2;
		const bottomEdge = this.state.ball.y + this.field.ballWidth / 2;

		if (topEdge <= 0 || bottomEdge >= this.field.height) {
			return true;
		} else {
			return false;
		}
	}


	detectPaddleCollision(leftPlayerId: number, rightPlayerId: number): boolean {
		const leftPaddleRight = this.field.leftPaddleX + this.field.paddleWidth;
		const ballLeft = this.state.ball.x - this.field.ballWidth / 2;
		const ballRight = this.state.ball.x + this.field.ballWidth / 2;


		const leftPaddleHeight = this.state.paddles[leftPlayerId].height ?? this.field.paddleHeight;
		const leftPaddleY = this.state.paddles[leftPlayerId].y;
		const leftPaddleTop = leftPaddleY - leftPaddleHeight / 2;
		const leftPaddleBottom = leftPaddleY + leftPaddleHeight / 2;


		if (
			this.state.ball.vx < 0 &&
			ballLeft <= leftPaddleRight &&
			ballLeft >= this.field.leftPaddleX &&
			this.state.ball.y + this.field.ballWidth / 2 >= leftPaddleTop &&
			this.state.ball.y - this.field.ballWidth / 2 <= leftPaddleBottom
		) {
			const impact = (this.state.ball.y - leftPaddleY) / (leftPaddleHeight / 2);
			this.state.ball.vy = impact * 1.5;
			this.state.ball.vx = Math.abs(this.state.ball.vx);
			return true;
		}

		const rightPaddleLeft = this.field.rightPaddleX;


		const rightPaddleHeight = this.state.paddles[rightPlayerId].height ?? this.field.paddleHeight;
		const rightPaddleY = this.state.paddles[rightPlayerId].y;
		const rightPaddleTop = rightPaddleY - rightPaddleHeight / 2;
		const rightPaddleBottom = rightPaddleY + rightPaddleHeight / 2;


		if (
			this.state.ball.vx > 0 &&
			ballRight >= rightPaddleLeft &&
			ballRight <= this.field.rightPaddleX + this.field.paddleWidth &&
			this.state.ball.y + this.field.ballWidth / 2 >= rightPaddleTop &&
			this.state.ball.y - this.field.ballWidth / 2 <= rightPaddleBottom
		) {
			const impact = (this.state.ball.y - rightPaddleY) / (rightPaddleHeight / 2);
			this.state.ball.vy = impact * 1.5;
			this.state.ball.vx = -Math.abs(this.state.ball.vx);
			return true;
		}

		return false;
	}
	increaseBallVelocity(increment: number) {

		const adjustedIncrement = increment * this.gameSpeed;

		if (this.state.ball.vx > 0) {
			this.state.ball.vx += adjustedIncrement;
		} else {
			this.state.ball.vx -= adjustedIncrement;
		}

		if (this.state.ball.vy > 0) {
			this.state.ball.vy += adjustedIncrement;
		} else {
			this.state.ball.vy -= adjustedIncrement;
		}
	}


	detectScoring(leftPlayerId: number, rightPlayerId: number): "left" | "right" | null {
		const ballLeft = this.state.ball.x - this.field.ballWidth / 2;
		const ballRight = this.state.ball.x + this.field.ballWidth / 2;

		if (ballLeft <= 0) {
			if (this.hasActiveShield(leftPlayerId)) {
				this.state.ball.x = 5;
				this.state.ball.vx = Math.abs(this.state.ball.vx);
				this.broadcast({ type: 'SHIELD_BLOCKED', playerId: leftPlayerId });
				return null;
			}
			this.state.scores[rightPlayerId] += 1;
			return "right";
		} else if (ballRight >= this.field.width) {
			if (this.hasActiveShield(rightPlayerId)) {
				this.state.ball.x = this.field.width - 5;
				this.state.ball.vx = -Math.abs(this.state.ball.vx);
				this.broadcast({ type: 'SHIELD_BLOCKED', playerId: rightPlayerId });
				return null;
			}
			this.state.scores[leftPlayerId] += 1;
			return "left";
		}
		return null;
	}


	checkWinCondition(leftPlayerId: number, rightPlayerId: number): number | null {
		if (this.state.scores[leftPlayerId] == this.winCondition) {
			return leftPlayerId;
		} else if (this.state.scores[rightPlayerId] == this.winCondition) {
			return rightPlayerId;
		}
		return null;
	}

	activatePowerUp(powerUp: PowerUp, playerId: number) {
		this.powerUpManager.activatePowerUp(powerUp, playerId);
	}

	getPaddleHeight(playerId: number): number {
		return this.powerUpManager.getPaddleHeight(playerId);
	}

	hasActiveShield(playerId: number): boolean {
		return this.powerUpManager.hasActiveShield(playerId);
	}
}
