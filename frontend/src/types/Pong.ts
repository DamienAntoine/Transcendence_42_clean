


export interface PongGameState {
  ball: {
    x: number;
    y: number;
    vx: number;
    vy: number;
  };
  paddles: {
    [playerId: number]: {
      y: number;
      height?: number; 
    };
  };
  scores: {
    [playerId: number]: number;
  };
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  countdown: number;
  powerUps?: PowerUp[];
  activeEffects?: ActiveEffect[];
}


export interface PongField {
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


export type PongAction =
  | { type: 'MOVE_PADDLE'; playerId: number; direction: 'up' | 'down' }
  | { type: 'START_GAME' }
  | { type: 'END_GAME' }
  | { type: 'COLLECT_POWER_UP'; powerUpId: string };


export interface PongQuery {
  gameId?: string;
  token: string;
  mode?: string;
  winCondition?: string;
  custom_field?: string;
  fieldWidth?: string;
  fieldHeight?: string;
  paddleHeight?: string;
  paddleWidth?: string;
}


export interface QueuedPlayer {
  playerId: number;
  socket: unknown;
  elo: number;
  displayName: string;
  query: PongQuery;
  joinedAt: number;
}


export enum PowerUpType {
  BIG_PADDLE = 'big_paddle',
  SHIELD = 'shield'
}


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


export interface ActiveEffect {
  type: PowerUpType;
  playerId: number;
  endTime: number;
  originalValue?: number;
}


export interface PowerUpSettings {
  bigPaddle: boolean;
  shield: boolean;
  spawnRate: number;
}


export type PongWSMessage =
  | { type: 'GAME_STATE'; state: PongGameState }
  | { type: 'GAME_OVER'; winnerId: number; winnerName: string; state: PongGameState }
  | { type: 'PLAYER_JOINED'; playerId: number; displayName: string }
  | { type: 'PLAYER_LEFT'; playerId: number }
  | { type: 'POWER_UP_ACTIVATED'; powerUpType: PowerUpType; playerId: number; duration: number }
  | { type: 'POWER_UP_EXPIRED'; effectType: PowerUpType; playerId: number }
  | { type: 'SHIELD_BLOCKED'; playerId: number }
  | { type: 'ERROR'; message: string };


export type MatchmakingWSMessage =
  | { type: 'MATCH_FOUND'; gameId: string; opponentName: string; opponentElo: number }
  | { type: 'MATCHMAKING_CANCELLED' }
  | { type: 'ERROR'; message: string };
