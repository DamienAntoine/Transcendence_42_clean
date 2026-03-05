


export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
}


export interface WebSocketManagerOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectMaxAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}


export type MessageHandler<T = unknown> = (message: T) => void;


export type StateChangeHandler = (state: WebSocketState) => void;


export type ErrorHandler = (error: Event | Error) => void;

// Get WebSocket URL from environment or window location
const getWebSocketUrl = (path: string): string => {
  if (import.meta.env.VITE_API_URL) {
    const wsBaseUrl = import.meta.env.VITE_API_URL.replace(/^http/, 'ws');
    return `${wsBaseUrl}${path}`;
  }
  const hostname = window.location.hostname;
  const port = window.location.port || '3000';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${hostname}:${port === '5173' ? '3000' : port}${path}`;
};

export class WebSocketManager<T = unknown> {
  private ws: WebSocket | null = null;
  private url: string;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;


  private messageHandlers: Set<MessageHandler<T>> = new Set();
  private stateChangeHandlers: Set<StateChangeHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();


  private options: Required<WebSocketManagerOptions>;

  constructor(url: string, options: WebSocketManagerOptions = {}) {
    // If URL is a full URL, use it; otherwise construct from path
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      this.url = url;
    } else {
      this.url = getWebSocketUrl(url);
    }

    this.options = {
      reconnect: options.reconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 3000,
      reconnectMaxAttempts: options.reconnectMaxAttempts ?? 5,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      debug: options.debug ?? false,
    };
  }


  connect(): void {
    if (this.state === WebSocketState.CONNECTED || this.state === WebSocketState.CONNECTING) {
      this.log('Already connected or connecting');
      return;
    }

    this.setState(WebSocketState.CONNECTING);
    this.log(`Connecting to ${this.url}`);

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      this.log('Connection failed:', error);
      this.setState(WebSocketState.FAILED);
      this.handleError(error as Error);
      this.attemptReconnect();
    }
  }


  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log('Connected');
      this.reconnectAttempts = 0;
      this.setState(WebSocketState.CONNECTED);
      this.startHeartbeat();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as T;
        this.log('Message received:', message);
        this.notifyMessageHandlers(message);
      } catch (error) {
        this.log('Failed to parse message:', error);
        this.handleError(error as Error);
      }
    };

    this.ws.onerror = (event: Event) => {
      this.log('WebSocket error:', event);
      this.handleError(event);
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.log(`Connection closed: ${event.code} - ${event.reason}`);
      this.stopHeartbeat();
      this.setState(WebSocketState.DISCONNECTED);

      if (this.options.reconnect && !event.wasClean) {
        this.attemptReconnect();
      }
    };
  }


  send(message: unknown): boolean {
    if (this.state !== WebSocketState.CONNECTED || !this.ws) {
      this.log('Cannot send message: not connected');
      return false;
    }

    try {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(data);
      this.log('Message sent:', message);
      return true;
    } catch (error) {
      this.log('Failed to send message:', error);
      this.handleError(error as Error);
      return false;
    }
  }


  disconnect(code: number = 1000, reason: string = 'Client disconnect'): void {
    this.log('Disconnecting...');
    this.options.reconnect = false;
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }

    this.setState(WebSocketState.DISCONNECTED);
  }


  private attemptReconnect(): void {
    if (!this.options.reconnect) return;

    if (this.reconnectAttempts >= this.options.reconnectMaxAttempts) {
      this.log('Max reconnection attempts reached');
      this.setState(WebSocketState.FAILED);
      return;
    }

    this.setState(WebSocketState.RECONNECTING);
    this.reconnectAttempts++;
    this.log(`Reconnecting (attempt ${this.reconnectAttempts}/${this.options.reconnectMaxAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.options.reconnectInterval);
  }


  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }


  private startHeartbeat(): void {
    if (!this.options.heartbeatInterval) return;

    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.state === WebSocketState.CONNECTED) {
        this.send({ type: 'PING' });
      }
    }, this.options.heartbeatInterval);
  }


  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }


  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.notifyStateChangeHandlers(newState);
    }
  }


  private notifyMessageHandlers(message: T): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        this.log('Error in message handler:', error);
      }
    });
  }


  private notifyStateChangeHandlers(state: WebSocketState): void {
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        this.log('Error in state change handler:', error);
      }
    });
  }


  private handleError(error: Event | Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        this.log('Error in error handler:', err);
      }
    });
  }


  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log('[WebSocketManager]', ...args);
    }
  }


  onMessage(handler: MessageHandler<T>): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }


  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    try {
      handler(this.state);
    } catch (error) {
      this.log('Error in initial state notification:', error);
    }
    return () => this.stateChangeHandlers.delete(handler);
  }


  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }


  getState(): WebSocketState {
    return this.state;
  }


  isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED;
  }


  cleanup(): void {
    this.disconnect();
    this.messageHandlers.clear();
    this.stateChangeHandlers.clear();
    this.errorHandlers.clear();
  }
}
