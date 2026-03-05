import { WebSocketManager, WebSocketState } from './WebSocketManager';
import { getToken } from '@/utils/storage';

interface StatusMessage {
  type: 'INITIAL_STATUS' | 'STATUS_CHANGED' | 'ERROR';
  status?: Record<number, boolean>;
  userId?: number;
  isOnline?: boolean;
  message?: string;
}

type StatusChangeCallback = (userId: number, isOnline: boolean) => void;

export class StatusWebSocketService {
  private ws: WebSocketManager<StatusMessage> | null = null;
  private statusCache: Map<number, boolean> = new Map();
  private callbacks: Set<StatusChangeCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: number | null = null;

  connect(): void {
    const token = getToken();
    if (!token) {
      console.warn('No token available for status WebSocket');
      return;
    }

    if (this.ws?.isConnected()) {
      console.log('Status WebSocket already connected');
      return;
    }

    console.log('Connecting Status WebSocket with token:', token.substring(0, 20) + '...');
    const wsUrl = `/ws/status?token=${token}`;
    this.ws = new WebSocketManager<StatusMessage>(wsUrl, {
      reconnect: true,
      reconnectInterval: 3000,
      reconnectMaxAttempts: this.maxReconnectAttempts,
      debug: true,
    });

    this.ws.onMessage((message) => this.handleMessage(message));

    this.ws.onStateChange((state) => {
      if (state === WebSocketState.CONNECTED) {
        console.log('Status WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      } else if (state === WebSocketState.DISCONNECTED || state === WebSocketState.FAILED) {
        console.log('Status WebSocket disconnected');
        this.reconnectAttempts++;
        this.stopHeartbeat();
      }
    });

    this.ws.onError((error) => {
      console.error('Status WebSocket error:', error);
    });

    this.ws.connect();
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
    this.statusCache.clear();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.isConnected()) {
        this.ws.send({ type: 'PING' } as any);
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(message: StatusMessage): void {
    switch (message.type) {
      case 'INITIAL_STATUS':
        if (message.status) {
          Object.entries(message.status).forEach(([userId, isOnline]) => {
            const id = Number(userId);
            this.statusCache.set(id, isOnline);
          });

          Object.entries(message.status).forEach(([userId, isOnline]) => {
            this.notifyCallbacks(Number(userId), isOnline);
          });
        }
        break;

      case 'STATUS_CHANGED':
        if (message.userId !== undefined && message.isOnline !== undefined) {
          const oldStatus = this.statusCache.get(message.userId);

          if (oldStatus !== message.isOnline) {
            this.statusCache.set(message.userId, message.isOnline);
            this.notifyCallbacks(message.userId, message.isOnline);
          }
        }
        break;

      case 'ERROR':
        console.error('Status WebSocket error message:', message.message);
        break;

      default:
        break;
    }
  }

  private notifyCallbacks(userId: number, isOnline: boolean): void {
    this.callbacks.forEach(callback => {
      try {
        callback(userId, isOnline);
      } catch (error) {
        console.error('Error in status change callback:', error);
      }
    });
  }

  onStatusChange(callback: StatusChangeCallback): () => void {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  getStatus(userId: number): boolean | undefined {
    return this.statusCache.get(userId);
  }

  isConnected(): boolean {
    return this.ws?.isConnected() ?? false;
  }
}

export const statusWebSocketService = new StatusWebSocketService();
