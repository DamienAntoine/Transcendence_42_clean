import { createElement } from '@/utils/dom';
import { customMatchService, CustomMatchInvitation } from '@/services/CustomMatchService';
import { showError, showSuccess } from '@/components/Notification';
import { router } from '@/router';

let notificationContainer: HTMLElement | null = null;
const shownInvitations = new Set<string>();

export function showInvitationNotification(invitation: CustomMatchInvitation): void {
  if (shownInvitations.has(invitation.invitationId)) {
    return;
  }

  shownInvitations.add(invitation.invitationId);

  if (!notificationContainer) {
    notificationContainer = createElement('div', {
      id: 'invitation-notifications',
      className: 'fixed bottom-4 right-4 z-50 space-y-2',
    });
    document.body.appendChild(notificationContainer);
  }

  const notification = createElement('div', {
    className:
      'bg-gray-800 border-2 border-primary-600 rounded-lg p-4 shadow-xl max-w-sm animate-slide-in',
  });

  const header = createElement('div', {
    className: 'flex items-center justify-between mb-3',
  });

  const title = createElement('div', {
    className: 'text-white font-bold text-lg',
    textContent: '🎮 Match Invitation',
  });

  const closeBtn = createElement('button', {
    className: 'text-gray-400 hover:text-white',
    innerHTML: '&times;',
  });

  closeBtn.style.fontSize = '1.5rem';
  closeBtn.addEventListener('click', () => {
    notification.remove();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);
  notification.appendChild(header);

  const content = createElement('div', {
    className: 'text-gray-300 mb-4',
  });

  const hostName = createElement('div', {
    className: 'font-semibold text-primary-400 mb-2',
    textContent: `${invitation.hostName} invites you to play!`,
  });

  const settings = createElement('div', {
    className: 'text-sm space-y-1',
  });

  settings.innerHTML = `
    <div>📏 Paddle size: ${invitation.settings.paddleSize}</div>
    <div>⚡ Speed: ${invitation.settings.gameSpeed}x</div>
    <div>🔮 Power-ups: ${
      invitation.settings.powerups.bigPaddle || invitation.settings.powerups.shield
        ? 'Enabled'
        : 'Disabled'
    }</div>
  `;

  content.appendChild(hostName);
  content.appendChild(settings);
  notification.appendChild(content);

  const actions = createElement('div', {
    className: 'flex gap-2',
  });

  const acceptBtn = createElement('button', {
    className:
      'flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition',
    textContent: 'Accept',
  });

  acceptBtn.addEventListener('click', async () => {
    try {
      const result = await customMatchService.acceptInvitation(invitation.invitationId);
      showSuccess('Match accepted! Redirecting...');
      notification.remove();

      setTimeout(() => {
        router.navigate(`/pong/game/${result.matchId}`);
      }, 1000);
    } catch (error) {
      showError('Unable to accept invitation');
      console.error('Failed to accept invitation:', error);
    }
  });

  const rejectBtn = createElement('button', {
    className:
      'flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition',
    textContent: 'Reject',
  });

  rejectBtn.addEventListener('click', async () => {
    try {
      await customMatchService.rejectInvitation(invitation.invitationId);
      showSuccess('Invitation rejected');
      notification.remove();
    } catch (error) {
      showError('Unable to reject invitation');
      console.error('Failed to reject invitation:', error);
    }
  });

  actions.appendChild(acceptBtn);
  actions.appendChild(rejectBtn);
  notification.appendChild(actions);

  notificationContainer.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 120000);
}

export async function checkPendingInvitations(): Promise<void> {
  try {
    const invitations = await customMatchService.getInvitations();

    invitations.forEach((invitation) => {
      showInvitationNotification(invitation);
    });
  } catch (error) {
    console.error('Failed to check pending invitations:', error);
  }
}

export function cleanupInvitationNotifications(): void {
  if (notificationContainer) {
    notificationContainer.remove();
    notificationContainer = null;
  }
}
