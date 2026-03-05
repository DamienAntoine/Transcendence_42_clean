import { createElement } from '@/utils/dom';
import { customMatchService, CustomMatchInvitation } from '@/services/CustomMatchService';
import { showSuccess } from '@/components/Notification';
import { router } from '@/router';

const shownAcceptedInvitations = new Set<string>();

export function showAcceptedInvitationNotification(invitation: CustomMatchInvitation): void {
  if (shownAcceptedInvitations.has(invitation.invitationId)) {
    return;
  }

  shownAcceptedInvitations.add(invitation.invitationId);

  const notificationContainer = document.getElementById('invitation-notifications') || createNotificationContainer();

  const notification = createElement('div', {
    className:
      'bg-gray-800 border-2 border-green-600 rounded-lg p-4 shadow-xl max-w-sm animate-slide-in',
  });

  const header = createElement('div', {
    className: 'flex items-center justify-between mb-3',
  });

  const title = createElement('div', {
    className: 'text-white font-bold text-lg',
    textContent: '✅ Invitation accepted!',
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

  const message = createElement('div', {
    className: 'font-semibold mb-2',
    textContent: 'Your invitation was accepted! The match will begin.',
  });

  content.appendChild(message);
  notification.appendChild(content);

  const joinBtn = createElement('button', {
    className:
      'w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded transition',
    textContent: 'Join Match',
  });

  joinBtn.addEventListener('click', () => {
    const matchId = `custom-${invitation.invitationId}`;
    notification.remove();
    showSuccess('Redirecting to match...');
    setTimeout(() => {
      router.navigate(`/pong/game/${matchId}`);
    }, 500);
  });

  notification.appendChild(joinBtn);
  notificationContainer.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      const matchId = `custom-${invitation.invitationId}`;
      notification.remove();
      router.navigate(`/pong/game/${matchId}`);
    }
  }, 5000);
}

export async function checkAcceptedInvitations(): Promise<void> {
  try {
    const invitations = await customMatchService.getAcceptedInvitations();

    invitations.forEach((invitation) => {
      showAcceptedInvitationNotification(invitation);
    });
  } catch (error) {
    console.error('Failed to check accepted invitations:', error);
  }
}

function createNotificationContainer(): HTMLElement {
  const container = createElement('div', {
    id: 'invitation-notifications',
    className: 'fixed bottom-4 right-4 z-50 space-y-2',
  });
  document.body.appendChild(container);
  return container;
}
