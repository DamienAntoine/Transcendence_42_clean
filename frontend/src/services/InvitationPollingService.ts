import { checkPendingInvitations } from '@/components/InvitationNotification';
import { checkAcceptedInvitations } from '@/components/AcceptedInvitationNotification';
import { isAuthenticated } from '@/utils/storage';

class InvitationPollingService {
  private intervalId: number | null = null;
  private readonly POLL_INTERVAL = 5000;
  private shownInvitations = new Set<string>();

  start(): void {
    if (this.intervalId) {
      return;
    }

    if (!isAuthenticated()) {
      return;
    }

    this.checkInvitations();

    this.intervalId = window.setInterval(() => {
      if (!isAuthenticated()) {
        this.stop();
        return;
      }
      this.checkInvitations();
    }, this.POLL_INTERVAL);

    console.log('Invitation polling started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.shownInvitations.clear();
      console.log('Invitation polling stopped');
    }
  }

  private async checkInvitations(): Promise<void> {
    if (!isAuthenticated()) {
      return;
    }
    try {
      await checkPendingInvitations();

      await checkAcceptedInvitations();
    } catch (error) {
      console.error('Error checking invitations:', error);
    }
  }

  markAsShown(invitationId: string): void {
    this.shownInvitations.add(invitationId);
  }

  hasBeenShown(invitationId: string): boolean {
    return this.shownInvitations.has(invitationId);
  }
}

export const invitationPollingService = new InvitationPollingService();
