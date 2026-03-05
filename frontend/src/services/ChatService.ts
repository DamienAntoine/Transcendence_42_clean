

import { apiClient } from './ApiClient';
import { WebSocketManager } from './WebSocketManager';
import { getToken } from '@/utils/storage';
import type {
  DmMessage,
  FriendsList,
  FriendStatus,
  UnreadCount,
  ChatWSMessage,
  DmWSMessage,
  DmWSAction,
} from '@/types';


export class ChatService {
  private globalChatWs: WebSocketManager<ChatWSMessage> | null = null;
  private dmWsConnections: Map<number, WebSocketManager<DmWSMessage>> = new Map();


  async getDmMessages(peerId: number): Promise<DmMessage[]> {
    try {
      return await apiClient.get<DmMessage[]>(`/chat/dm/${peerId}/messages`);
    } catch (error) {
      throw new Error(`Failed to fetch messages with user ${peerId}`);
    }
  }


  async blockUser(peerId: number): Promise<{ success: boolean }> {
    try {
      return await apiClient.post<{ success: boolean }>(`/chat/dm/${peerId}/block`);
    } catch (error) {
      throw new Error(`Failed to block user ${peerId}`);
    }
  }


  async unblockUser(peerId: number): Promise<{ success: boolean }> {
    try {
      return await apiClient.delete<{ success: boolean }>(`/chat/dm/${peerId}/unblock`);
    } catch (error) {
      throw new Error(`Failed to unblock user ${peerId}`);
    }
  }

  async isUserBlocked(peerId: number): Promise<boolean> {
    try {
      const response = await apiClient.get<{ isBlocked: boolean }>(`/chat/dm/${peerId}/isBlocked`);
      return response.isBlocked;
    } catch (error) {
      throw new Error(`Failed to check if user ${peerId} is blocked`);
    }
  }


  async markMessagesAsRead(peerId: number, lastReadId: number): Promise<{ success: boolean }> {
    try {
      return await apiClient.post<{ success: boolean }>(`/chat/dm/${peerId}/read`, { lastReadId });
    } catch (error) {
      throw new Error('Failed to mark messages as read');
    }
  }


  async getUnreadCounts(): Promise<UnreadCount[]> {
    try {
      return await apiClient.get<UnreadCount[]>('/chat/unread');
    } catch (error) {
      throw new Error('Failed to fetch unread counts');
    }
  }


  async getFriendsList(): Promise<FriendsList> {
    try {
      return await apiClient.get<FriendsList>('/chat/friends/list');
    } catch (error) {
      throw new Error('Failed to fetch friends list');
    }
  }


  async sendFriendRequest(friendId: number): Promise<{ success: boolean }> {
    try {
      return await apiClient.post<{ success: boolean }>(`/chat/friends/${friendId}/sendRequest`);
    } catch (error) {
      throw new Error(`Failed to send friend request to user ${friendId}`);
    }
  }


  async acceptFriendRequest(friendId: number): Promise<{ success: boolean }> {
    try {
      return await apiClient.post<{ success: boolean }>(`/chat/friends/${friendId}/acceptRequest`);
    } catch (error) {
      throw new Error(`Failed to accept friend request from user ${friendId}`);
    }
  }


  async rejectFriendRequest(friendId: number): Promise<{ success: boolean }> {
    try {
      return await apiClient.post<{ success: boolean }>(`/chat/friends/${friendId}/rejectRequest`);
    } catch (error) {
      throw new Error(`Failed to reject friend request from user ${friendId}`);
    }
  }


  async removeFriend(friendId: number): Promise<{ success: boolean }> {
    try {
      return await apiClient.delete<{ success: boolean }>(`/chat/friends/${friendId}/removeFriend`);
    } catch (error) {
      throw new Error(`Failed to remove friend ${friendId}`);
    }
  }


  async getFriendsStatus(): Promise<FriendStatus[]> {
    try {
      return await apiClient.get<FriendStatus[]>('/chat/friends/status');
    } catch (error) {
      throw new Error('Failed to fetch friends status');
    }
  }


  connectToGlobalChat(): WebSocketManager<ChatWSMessage> {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    if (this.globalChatWs?.isConnected()) {
      return this.globalChatWs;
    }

    if (this.globalChatWs) {
      this.globalChatWs.cleanup();
      this.globalChatWs = null;
    }

    const wsUrl = `/ws/chat/global?token=${token}`;
    this.globalChatWs = new WebSocketManager<ChatWSMessage>(wsUrl, {
      reconnect: true,
      debug: true,
    });

    return this.globalChatWs;
  }

  requestGlobalChatHistory(): boolean {
    if (!this.globalChatWs?.isConnected()) {
      console.warn('Cannot request history: not connected to global chat');
      return false;
    }

    return this.globalChatWs.send({
      type: 'REQUEST_HISTORY',
    });
  }


  disconnectFromGlobalChat(): void {
    if (this.globalChatWs) {
      this.globalChatWs.disconnect();
      this.globalChatWs = null;
    }
  }


  sendGlobalChatMessage(content: string): boolean {
    if (!this.globalChatWs?.isConnected()) {
      throw new Error('Not connected to global chat');
    }

    return this.globalChatWs.send({
      type: 'CHAT_MESSAGE',
      content,
    });
  }


  sendPongInvite(gameId: string): boolean {
    if (!this.globalChatWs?.isConnected()) {
      throw new Error('Not connected to global chat');
    }

    return this.globalChatWs.send({
      type: 'INVITE_PONG',
      gameId,
    });
  }


  connectToDm(peerId: number): WebSocketManager<DmWSMessage> {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }


    const existing = this.dmWsConnections.get(peerId);
    if (existing?.isConnected()) {
      return existing;
    }

    if (existing) {
      existing.disconnect();
      this.dmWsConnections.delete(peerId);
    }

    const wsUrl = `/ws/chat/dm/${peerId}?token=${token}`;
    const dmWs = new WebSocketManager<DmWSMessage>(wsUrl, {
      reconnect: true,
      debug: true,
    });

    this.dmWsConnections.set(peerId, dmWs);
    return dmWs;
  }


  disconnectFromDm(peerId: number): void {
    const dmWs = this.dmWsConnections.get(peerId);
    if (dmWs) {
      dmWs.disconnect();
      this.dmWsConnections.delete(peerId);
    }
  }


  sendDmMessage(peerId: number, content: string): boolean {
    const dmWs = this.dmWsConnections.get(peerId);
    if (!dmWs?.isConnected()) {
      throw new Error(`Not connected to DM with user ${peerId}`);
    }

    const action: DmWSAction = {
      type: 'SEND_MESSAGE',
      message: content,
    };

    return dmWs.send(action);
  }


  requestDmHistory(peerId: number): boolean {
    const dmWs = this.dmWsConnections.get(peerId);
    if (!dmWs?.isConnected()) {
      throw new Error(`Not connected to DM with user ${peerId}`);
    }

    const action: DmWSAction = {
      type: 'REQUEST_HISTORY',
    };

    return dmWs.send(action);
  }


  markDmAsRead(peerId: number, lastReadId: number): boolean {
    const dmWs = this.dmWsConnections.get(peerId);
    if (!dmWs?.isConnected()) {
      throw new Error(`Not connected to DM with user ${peerId}`);
    }

    const action: DmWSAction = {
      type: 'MARK_READ',
      lastReadId,
    };

    return dmWs.send(action);
  }


  cleanup(): void {
    this.disconnectFromGlobalChat();
    this.dmWsConnections.forEach((ws) => ws.disconnect());
    this.dmWsConnections.clear();
  }
}


export const chatService = new ChatService();
