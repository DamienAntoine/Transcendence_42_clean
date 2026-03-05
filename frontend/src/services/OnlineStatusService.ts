

import { apiClient } from './ApiClient';
import { isAuthenticated } from '@/utils/storage';

class OnlineStatusService {
  private heartbeatInterval: number | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 30000; 

  
  startHeartbeat(): void {
    
    this.stopHeartbeat();

    
    this.sendHeartbeat();

    
    this.heartbeatInterval = window.setInterval(() => {
      if (isAuthenticated()) {
        this.sendHeartbeat();
      } else {
        this.stopHeartbeat();
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  
  stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  
  private async sendHeartbeat(): Promise<void> {
    try {
      await apiClient.post('/chat/heartbeat', {});
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }
}


export const onlineStatusService = new OnlineStatusService();
