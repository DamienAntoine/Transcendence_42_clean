

import { apiClient } from './ApiClient';
import { getToken } from '@/utils/storage';

export interface Friend {
  userId: number;
  displayName: string;
  userName: string;
  profilePicture?: string;
  isOnline: boolean;
}

export interface FriendStatus {
  [userId: number]: boolean;
}

export class FriendsService {
  async getFriendsList(): Promise<number[]> {
    try {
      if (!getToken()) return [];
      const response = await apiClient.get<{ friends: number[] }>('/chat/friends/list');
      return response.friends;
    } catch (error) {
      console.error('Failed to fetch friends list:', error);
      throw new Error('Failed to fetch friends list');
    }
  }

  async getFriendsStatus(): Promise<FriendStatus> {
    try {
      if (!getToken()) return {};
      const response = await apiClient.get<{ status: FriendStatus }>('/chat/friends/status');
      return response.status;
    } catch (error) {
      console.error('Failed to fetch friends status:', error);
      throw new Error('Failed to fetch friends status');
    }
  }

  async sendFriendRequest(friendId: number): Promise<boolean> {
    try {
      const response = await apiClient.post<{ friendRequest: boolean }>(
        `/chat/friends/${friendId}/sendRequest`,
        {}
      );
      return response.friendRequest;
    } catch (error) {
      console.error('Failed to send friend request:', error);
      throw new Error('Failed to send friend request');
    }
  }

  async acceptFriendRequest(friendId: number): Promise<boolean> {
    try {
      const response = await apiClient.post<{ friendResponse: boolean }>(
        `/chat/friends/${friendId}/acceptRequest`,
        {}
      );
      return response.friendResponse;
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      throw new Error('Failed to accept friend request');
    }
  }

  async rejectFriendRequest(friendId: number): Promise<boolean> {
    try {
      const response = await apiClient.post<{ friendResponse: boolean }>(
        `/chat/friends/${friendId}/rejectRequest`,
        {}
      );
      return response.friendResponse;
    } catch (error) {
      console.error('Failed to reject friend request:', error);
      throw new Error('Failed to reject friend request');
    }
  }

  async removeFriend(friendId: number): Promise<boolean> {
    try {
      const response = await apiClient.delete<{ deletedFriend: boolean }>(
        `/chat/friends/${friendId}/removeFriend`
      );
      return response.deletedFriend;
    } catch (error) {
      console.error('Failed to remove friend:', error);
      throw new Error('Failed to remove friend');
    }
  }

  async getPendingReceivedRequests(): Promise<number[]> {
    try {
      const response = await apiClient.get<{ requests: number[] }>('/chat/friends/pending/received');
      return response.requests;
    } catch (error) {
      console.error('Failed to fetch pending received requests:', error);
      throw new Error('Failed to fetch pending received requests');
    }
  }

  async getPendingSentRequests(): Promise<number[]> {
    try {
      const response = await apiClient.get<{ requests: number[] }>('/chat/friends/pending/sent');
      return response.requests;
    } catch (error) {
      console.error('Failed to fetch pending sent requests:', error);
      throw new Error('Failed to fetch pending sent requests');
    }
  }

  async cancelFriendRequest(friendId: number): Promise<boolean> {
    try {
      const response = await apiClient.delete<{ cancelled: boolean }>(
        `/chat/friends/${friendId}/cancelRequest`
      );
      return response.cancelled;
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
      throw new Error('Failed to cancel friend request');
    }
  }

  async getDmMessages(
    peerId: number,
    options?: { limit?: number; beforeId?: number }
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.beforeId) params.append('beforeId', String(options.beforeId));

      const queryString = params.toString();
      const url = `/chat/dm/${peerId}/messages${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<{ messages: any[] }>(url);
      return response.messages;
    } catch (error) {
      console.error('Failed to fetch DM messages:', error);
      throw new Error('Failed to fetch DM messages');
    }
  }

  async markAsRead(peerId: number, lastReadId: number): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        `/chat/dm/${peerId}/read`,
        { lastReadId }
      );
      return response.success;
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      return false;
    }
  }

  async getUnreadSummary(): Promise<Record<number, number>> {
    try {
      const response = await apiClient.get<{ summary: Record<number, number> }>('/chat/unread');
      return response.summary;
    } catch (error) {
      console.error('Failed to fetch unread summary:', error);
      return {};
    }
  }
}

export const friendsService = new FriendsService();
