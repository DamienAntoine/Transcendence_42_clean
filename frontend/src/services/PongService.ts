

import { WebSocketManager } from './WebSocketManager';
import { getToken } from '@/utils/storage';
import type {
  PongWSMessage,
  MatchmakingWSMessage,
  PongAction,
  PongQuery,
} from '@/types';


export class PongService {
  private gameWs: WebSocketManager<PongWSMessage> | null = null;
  private matchmakingWs: WebSocketManager<MatchmakingWSMessage> | null = null;


  connectToGame(gameId: string, options?: Partial<PongQuery>): WebSocketManager<PongWSMessage> {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    if (this.gameWs?.isConnected()) {
      this.gameWs.disconnect();
    }


    const params = new URLSearchParams({
      token,
      ...(options?.mode && { mode: options.mode }),
      ...(options?.winCondition && { winCondition: options.winCondition }),
      ...(options?.custom_field && { custom_field: options.custom_field }),
      ...(options?.fieldWidth && { fieldWidth: options.fieldWidth }),
      ...(options?.fieldHeight && { fieldHeight: options.fieldHeight }),
      ...(options?.paddleHeight && { paddleHeight: options.paddleHeight.toString() }),
      ...(options?.paddleWidth && { paddleWidth: options.paddleWidth.toString() }),
    });

    const wsUrl = `/ws/pong/${gameId}?${params.toString()}`;
    this.gameWs = new WebSocketManager<PongWSMessage>(wsUrl, {
      reconnect: false,
      debug: true,
    });

    this.gameWs.connect();
    return this.gameWs;
  }


  disconnectFromGame(): void {
    if (this.gameWs) {
      this.gameWs.disconnect();
      this.gameWs = null;
    }
  }


  sendAction(action: PongAction): boolean {
    if (!this.gameWs?.isConnected()) {
      throw new Error('Not connected to game');
    }

    return this.gameWs.send(action);
  }


  movePaddleUp(playerId: number): boolean {
    return this.sendAction({
      type: 'MOVE_PADDLE',
      playerId,
      direction: 'up',
    });
  }


  movePaddleDown(playerId: number): boolean {
    return this.sendAction({
      type: 'MOVE_PADDLE',
      playerId,
      direction: 'down',
    });
  }


  startGame(): boolean {
    return this.sendAction({
      type: 'START_GAME',
    });
  }


  endGame(): boolean {
    return this.sendAction({
      type: 'END_GAME',
    });
  }


  collectPowerUp(powerUpId: string): boolean {
    return this.sendAction({
      type: 'COLLECT_POWER_UP',
      powerUpId,
    });
  }


  connectToMatchmaking(options?: Partial<PongQuery>): WebSocketManager<MatchmakingWSMessage> {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    if (this.matchmakingWs?.isConnected()) {
      return this.matchmakingWs;
    }


    const params = new URLSearchParams({
      token,
      ...(options?.mode && { mode: options.mode }),
      ...(options?.winCondition && { winCondition: options.winCondition }),
      ...(options?.custom_field && { custom_field: options.custom_field }),
      ...(options?.fieldWidth && { fieldWidth: options.fieldWidth }),
      ...(options?.fieldHeight && { fieldHeight: options.fieldHeight }),
      ...(options?.paddleHeight && { paddleHeight: options.paddleHeight.toString() }),
      ...(options?.paddleWidth && { paddleWidth: options.paddleWidth.toString() }),
    });

    const wsUrl = `/ws/pong/matchmaking?${params.toString()}`;
    this.matchmakingWs = new WebSocketManager<MatchmakingWSMessage>(wsUrl, {
      reconnect: true,
      debug: true,
    });

    this.matchmakingWs.connect();
    return this.matchmakingWs;
  }


  disconnectFromMatchmaking(): void {
    if (this.matchmakingWs) {
      this.matchmakingWs.disconnect();
      this.matchmakingWs = null;
    }
  }


  cancelMatchmaking(): boolean {
    if (!this.matchmakingWs?.isConnected()) {
      throw new Error('Not connected to matchmaking');
    }

    return this.matchmakingWs.send({
      type: 'CANCEL_MATCHMAKING',
    });
  }


  getGameWebSocket(): WebSocketManager<PongWSMessage> | null {
    return this.gameWs;
  }


  getMatchmakingWebSocket(): WebSocketManager<MatchmakingWSMessage> | null {
    return this.matchmakingWs;
  }


  cleanup(): void {
    this.disconnectFromGame();
    this.disconnectFromMatchmaking();
  }
}


export const pongService = new PongService();
