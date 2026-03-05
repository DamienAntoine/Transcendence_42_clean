

import { apiClient } from './ApiClient';
import type {
  GameHistory,
  CreateGameBody,
  GameIdResponse,
} from '@/types';


export class GameService {
  
  async createGame(player1Id: number, player2Id: number): Promise<{ success: boolean; gameId?: string }> {
    try {
      const body: CreateGameBody = { player1Id, player2Id };
      return await apiClient.post<{ success: boolean; gameId?: string }>('/game/', body);
    } catch (error) {
      throw new Error('Failed to create game');
    }
  }

  
  async startGame(gameId: string): Promise<{ success: boolean }> {
    try {
      return await apiClient.patch<{ success: boolean }>('/game/start', { gameId });
    } catch (error) {
      throw new Error('Failed to start game');
    }
  }

  
  async finishGame(gameId: string): Promise<{ success: boolean }> {
    try {
      return await apiClient.patch<{ success: boolean }>('/game/finish', { gameId });
    } catch (error) {
      throw new Error('Failed to finish game');
    }
  }

  
  async getMatchById(matchId: string): Promise<GameHistory> {
    try {
      return await apiClient.get<GameHistory>(`/game/${matchId}/match`);
    } catch (error) {
      throw new Error(`Failed to fetch match ${matchId}`);
    }
  }

  
  async generateGameId(): Promise<string> {
    try {
      const response = await apiClient.get<GameIdResponse>('/game/pong/generateGameId');
      return response.gameId;
    } catch (error) {
      throw new Error('Failed to generate game ID');
    }
  }
}


export const gameService = new GameService();
