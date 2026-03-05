

import { apiClient } from './ApiClient';
import { getToken } from '@/utils/storage';

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

export class CustomMatchService {
  
  async sendInvitation(guestId: number, settings: CustomMatchSettings): Promise<CustomMatchInvitation> {
    try {
      const response = await apiClient.post<{ invitation: CustomMatchInvitation }>(
        '/pong/custom/invite',
        { guestId, settings }
      );
      return response.invitation;
    } catch (error) {
      console.error('Failed to send invitation:', error);
      throw new Error('Failed to send invitation');
    }
  }

  
  async acceptInvitation(invitationId: string): Promise<{ matchId: string; invitation: CustomMatchInvitation }> {
    try {
      const response = await apiClient.post<{ matchId: string; invitation: CustomMatchInvitation }>(
        `/pong/custom/accept/${invitationId}`,
        {}
      );
      return response;
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw new Error('Failed to accept invitation');
    }
  }

  
  async rejectInvitation(invitationId: string): Promise<void> {
    try {
      await apiClient.post(`/pong/custom/reject/${invitationId}`, {});
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      throw new Error('Failed to reject invitation');
    }
  }

  
  async getInvitations(): Promise<CustomMatchInvitation[]> {
    try {
      
      if (!getToken()) {
        return [];
      }
      console.log('Fetching custom match invitations...');
      const response = await apiClient.get<{ invitations: CustomMatchInvitation[] }>(
        '/pong/custom/invitations'
      );
      console.log('Invitations received:', response.invitations);
      return response.invitations;
    } catch (error) {
      console.error('Failed to get invitations:', error);
      
      return [];
    }
  }

  
  async getAcceptedInvitations(): Promise<CustomMatchInvitation[]> {
    try {
      
      if (!getToken()) {
        return [];
      }
      console.log('Fetching accepted custom match invitations...');
      const response = await apiClient.get<{ invitations: CustomMatchInvitation[] }>(
        '/pong/custom/invitations/accepted'
      );
      console.log('Accepted invitations received:', response.invitations);
      return response.invitations;
    } catch (error) {
      console.error('Failed to get accepted invitations:', error);
      return [];
    }
  }
}

export const customMatchService = new CustomMatchService();
