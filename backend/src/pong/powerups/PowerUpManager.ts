import { PowerUp, PowerUpType, ActiveEffect } from './PowerUpTypes';
import { PongGame } from '../PongGame';

export class PowerUpManager {

	private static readonly DURATIONS = {
		[PowerUpType.BIG_PADDLE]: 10000,
		[PowerUpType.SHIELD]: 5000
	};

	private game: PongGame;

	constructor(game: PongGame) {
		this.game = game;
	}

	activatePowerUp(powerUp: PowerUp, playerId: number) {
		switch (powerUp.type) {
			case PowerUpType.BIG_PADDLE:
				this.activateBigPaddle(playerId);
				break;
			case PowerUpType.SHIELD:
				this.activateShield(playerId);
				break;
			default:
				console.warn(`Unknown power-up type: ${powerUp.type}`);
				return;
		}

		this.game.broadcast({
			type: 'POWER_UP_ACTIVATED',
			powerUpType: powerUp.type,
			playerId,
			duration: PowerUpManager.DURATIONS[powerUp.type]
		});
	}

	private activateBigPaddle(playerId: number) {
		const now = Date.now();
		const duration = PowerUpManager.DURATIONS[PowerUpType.BIG_PADDLE];

		this.game.activeEffects = this.game.activeEffects.filter(
			e => !(e.type === PowerUpType.BIG_PADDLE && e.playerId === playerId)
		);

		this.game.activeEffects.push({
			type: PowerUpType.BIG_PADDLE,
			playerId,
			endTime: now + duration,
			originalValue: this.game.field.paddleHeight
		});
	}

	private activateShield(playerId: number) {
		const now = Date.now();
		const duration = PowerUpManager.DURATIONS[PowerUpType.SHIELD];

		this.game.shields[playerId] = {
			active: true,
			endTime: now + duration
		};

		
		this.game.activeEffects = this.game.activeEffects.filter(
			e => !(e.type === PowerUpType.SHIELD && e.playerId === playerId)
		);

		this.game.activeEffects.push({
			type: PowerUpType.SHIELD,
			playerId,
			endTime: now + duration
		});
	}

	spawnPowerUp() {
		const now = Date.now();
		const spawnInterval = Math.max(5000, 15000 - (this.game.powerUpSettings.spawnRate * 1000));

		if (now - this.game.lastPowerUpSpawn < spawnInterval)
			return;

		if (this.game.powerUps.length >= 2)
			return;

		const availableTypes: PowerUpType[] = [];
		if (this.game.powerUpSettings.bigPaddle)
			availableTypes.push(PowerUpType.BIG_PADDLE);
		if (this.game.powerUpSettings.shield)
			availableTypes.push(PowerUpType.SHIELD);

		if (availableTypes.length === 0)
			return ;

		const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];

		const powerUp: PowerUp = {
			id: Math.random().toString(36).substr(2, 9),
			type: randomType,
			x: Math.random() * (this.game.field.width - 10) + 5,
			y: Math.random() * (this.game.field.height - 10) + 5,
			width: 5,
			height: 5,
			active: true,
			spawnTime: now
		};

		this.game.powerUps.push(powerUp);
		this.game.lastPowerUpSpawn = now;

		this.game.broadcast({
			type: 'POWER_UP_SPAWNED',
			powerUp: powerUp
		});
	}

	checkPowerUpCollision() {
		for (let i = this.game.powerUps.length - 1; i >= 0; i--) {
			const powerUp = this.game.powerUps[i];
			if (!powerUp.active) continue;

			const ball = this.game.state.ball;

			if (
				ball.x < powerUp.x + powerUp.width &&
				ball.x + this.game.field.ballWidth > powerUp.x &&
				ball.y < powerUp.y + powerUp.height &&
				ball.y + this.game.field.ballWidth > powerUp.y
			) {
				
				
				const playerId = ball.vx > 0 ? this.game.playerIds[0] : this.game.playerIds[1];

				this.activatePowerUp(powerUp, playerId);
				this.game.powerUps.splice(i, 1);
				break;
			}
		}
	}

	updateActiveEffects() {
		const now = Date.now();

		for (let i = this.game.activeEffects.length - 1; i >= 0; i--) {
			const effect = this.game.activeEffects[i];

			if (now >= effect.endTime) {
				this.game.activeEffects.splice(i, 1);

				this.game.broadcast({
					type: 'POWER_UP_EXPIRED',
					effectType: effect.type,
					playerId: effect.playerId
				});
			}
		}

		for (const playerId in this.game.shields) {
			const shield = this.game.shields[playerId];
			if (shield.active && now >= shield.endTime) {
				shield.active = false;

				this.game.broadcast({
					type: 'POWER_UP_EXPIRED',
					effectType: PowerUpType.SHIELD,
					playerId: parseInt(playerId)
				});
			}
		}
	}

	
	getPaddleHeight(playerId: number): number {
		const bigPaddleEffect = this.game.activeEffects.find(
			e => e.type === PowerUpType.BIG_PADDLE && e.playerId === playerId
		);

		return bigPaddleEffect ? this.game.field.paddleHeight * 1.5 : this.game.field.paddleHeight;
	}

	hasActiveShield(playerId: number): boolean {
		return this.game.shields[playerId]?.active || false;
	}
}
