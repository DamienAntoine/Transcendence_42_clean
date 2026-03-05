

import { apiClient } from './ApiClient';
import { mapBackendUser, mapLeaderboardRow } from '@/utils/userMapper';
import type {
  User,
  UserLeaderboardRow,
  GameHistory,
  UpdateDisplayNameBody,
  UpdatePasswordBody,
} from '@/types';


export class UserService {
  
  async getUserById(userId: number): Promise<User> {
    try {
      const backendUser = await apiClient.get<any>(`/user/${userId}`);
      return mapBackendUser(backendUser);
    } catch (error) {
      throw new Error(`Failed to fetch user ${userId}`);
    }
  }

  
  async getCurrentUser(): Promise<User> {
    try {
      const backendUser = await apiClient.get<any>('/user/me');
      return mapBackendUser(backendUser);
    } catch (error) {
      throw new Error('Failed to fetch current user');
    }
  }

  
  async getLeaderboard(): Promise<UserLeaderboardRow[]> {
    try {
      const backendLeaderboard = await apiClient.get<any[]>('/user/leaderboard');
      return backendLeaderboard.map(row => mapLeaderboardRow(row));
    } catch (error) {
      throw new Error('Failed to fetch leaderboard');
    }
  }

  
  async getUserGameHistory(userId: number): Promise<GameHistory[]> {
    try {
      return await apiClient.get<GameHistory[]>(`/user/${userId}/gamehistory`);
    } catch (error) {
      throw new Error(`Failed to fetch game history for user ${userId}`);
    }
  }

  
  async getUserStats(userId: number): Promise<{ wins: number; losses: number; gamesPlayed: number }> {
    try {
      return await apiClient.get<{ wins: number; losses: number; gamesPlayed: number }>(`/user/${userId}/stats`);
    } catch (error) {
      throw new Error(`Failed to fetch stats for user ${userId}`);
    }
  }

  
  async updateDisplayName(displayName: string): Promise<{ success: boolean; message?: string }> {
    try {
      const body: UpdateDisplayNameBody = { displayName };
      return await apiClient.put<{ success: boolean; message?: string }>(
        '/user/updateDisplayName',
        body
      );
    } catch (error) {
      throw new Error('Failed to update display name');
    }
  }

  
  async updatePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const body: UpdatePasswordBody = {
        password: currentPassword,
        newPassword,
      };
      return await apiClient.put<{ success: boolean; message?: string }>(
        '/user/updatePassword',
        body
      );
    } catch (error) {
      throw new Error('Failed to update password');
    }
  }

  
  async uploadProfilePicture(file: File): Promise<{ success: boolean; url?: string }> {
    try {
      console.log(`Uploading file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      const result = await apiClient.uploadFile<{ success: boolean; filename?: string }>(
        '/user/uploadpicture',
        file,
        'avatar'
      );
      console.log('Upload result:', result);
      return result;
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error('Failed to upload profile picture');
    }
  }
}


export const userService = new UserService();
