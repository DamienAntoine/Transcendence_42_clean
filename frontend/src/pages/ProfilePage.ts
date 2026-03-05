import { createElement } from '@/utils/dom';
import { Navbar } from '@/components/Navbar';
import { UserCard } from '@/components/UserCard';
import { Loader, showLoader, hideLoader } from '@/components/Loader';
import { showError, showSuccess } from '@/components/Notification';
import { showModal } from '@/components/Modal';
import { openCustomMatchModal } from '@/components/CustomMatchModal';
import { getUser } from '@/utils/storage';
import { userService } from '@/services/UserService';
import { friendsService } from '@/services/FriendsService';
import { chatService } from '@/services/ChatService';
import { statusWebSocketService } from '@/services/StatusWebSocketService';
import { router } from '@/router';
import { validateDisplayName } from '@/utils/validation';
import type { User } from '@/types';

export function ProfilePage(): HTMLElement {
  const container = createElement('div', {
    className: 'min-h-screen bg-gray-900',
  });

  const navbar = Navbar();
  container.appendChild(navbar);

  const main = createElement('main', {
    className: 'pt-20 px-4 pb-12',
  });

  const maxWidth = createElement('div', {
    className: 'max-w-5xl mx-auto',
  });

  const loaderContainer = createElement('div', {
    className: 'flex justify-center py-12',
  });
  const loader = Loader({ size: 'xl' });
  loaderContainer.appendChild(loader);
  maxWidth.appendChild(loaderContainer);

  main.appendChild(maxWidth);
  container.appendChild(main);

  loadProfile(maxWidth, loaderContainer);

  return container;
}

async function loadProfile(container: HTMLElement, loaderContainer: HTMLElement): Promise<void> {
  try {
    const pathParts = window.location.pathname.split('/');
    const userIdParam = pathParts[pathParts.indexOf('profile') + 1];
    const userId = userIdParam ? parseInt(userIdParam, 10) : undefined;

    const currentUser = getUser();
    let profileUser: User;

    if (userId && !isNaN(userId)) {
      profileUser = await userService.getUserById(userId);
    } else if (currentUser) {
      profileUser = currentUser;
    } else {
      throw new Error('User not found');
    }

    try {
      const stats = await userService.getUserStats(profileUser.id);
      profileUser.wins = stats.wins;
      profileUser.losses = stats.losses;
      profileUser.gamesPlayed = stats.gamesPlayed;
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }

    container.removeChild(loaderContainer);

    displayProfile(container, profileUser, currentUser);
  } catch (error) {
    container.removeChild(loaderContainer);
    const message = error instanceof Error ? error.message : 'Error loading profile';
    showError(message);

    const errorDiv = createElement('div', {
      className: 'text-center py-12',
    });

    const errorText = createElement('p', {
      className: 'text-red-400 text-xl mb-4',
      textContent: 'Unable to load profile',
    });

    const backBtn = createElement('button', {
      className: 'px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition',
      textContent: 'Back to home',
    });

    backBtn.addEventListener('click', () => router.navigate('/'));

    errorDiv.appendChild(errorText);
    errorDiv.appendChild(backBtn);
    container.appendChild(errorDiv);
  }
}

async function displayProfile(container: HTMLElement, profileUser: User, currentUser: User | null): Promise<void> {
  const isOwnProfile = currentUser?.id === profileUser.id;

  let isFriend = false;
  let isOnline = false;
  let isBlocked = false;
  let statusUnsubscribe: (() => void) | null = null;

  if (!isOwnProfile && currentUser) {
    try {
      const friendIds = await friendsService.getFriendsList();
      isFriend = friendIds.includes(profileUser.id);

      const cachedStatus = statusWebSocketService.getStatus(profileUser.id);
      if (cachedStatus !== undefined) {
        isOnline = cachedStatus;
      } else {
        const friendsStatus = await friendsService.getFriendsStatus();
        isOnline = friendsStatus[profileUser.id] || false;
      }

      isBlocked = await chatService.isUserBlocked(profileUser.id);
    } catch (error) {
      console.error('Failed to check friend status:', error);
    }
  } else if (isOwnProfile) {
    isOnline = true;
  }

  const cardSection = createElement('div', {
    className: 'mb-8',
  });

  const userCard = UserCard({
    user: { ...profileUser, isOnline },
    showStats: true,
    showActions: !isOwnProfile,
    onViewProfile: undefined,
    onAvatarClick: profileUser.profilePicture ? () => {
      openAvatarModal(profileUser.profilePicture!, profileUser.displayName);
    } : undefined,
    onChallenge: () => {
      openCustomMatchModal(profileUser);
    },
    onAddFriend: !isFriend ? async (userId) => {
      try {
        await friendsService.sendFriendRequest(userId);
        showSuccess('Friend request sent!');
        window.location.reload();
      } catch (error) {
        showError('Unable to send request');
      }
    } : undefined,
    onRemoveFriend: isFriend ? async (userId) => {
      if (confirm(`Remove ${profileUser.displayName} from your friends?`)) {
        try {
          await friendsService.removeFriend(userId);
          showSuccess('Friend removed');
          window.location.reload();
        } catch (error) {
          showError('Unable to remove this friend');
        }
      }
    } : undefined,
    onBlock: !isBlocked ? async (userId) => {
      if (confirm(`Block ${profileUser.displayName}? You won't be able to receive messages from this user.`)) {
        try {
          await chatService.blockUser(userId);
          showSuccess('User blocked successfully');
          window.location.reload();
        } catch (error) {
          showError('Unable to block this user');
        }
      }
    } : undefined,
    onUnblock: isBlocked ? async (userId) => {
      if (confirm(`Unblock ${profileUser.displayName}?`)) {
        try {
          await chatService.unblockUser(userId);
          showSuccess('User unblocked successfully');
          window.location.reload();
        } catch (error) {
          showError('Unable to unblock this user');
        }
      }
    } : undefined,
  });

  cardSection.appendChild(userCard);
  container.appendChild(cardSection);

  if (!isOwnProfile) {
    statusUnsubscribe = statusWebSocketService.onStatusChange((userId, newIsOnline) => {
      if (userId === profileUser.id) {
        const statusDot = cardSection.querySelector('.status-dot');
        if (statusDot) {
          statusDot.classList.remove('bg-green-500', 'bg-gray-500');
          statusDot.classList.add(newIsOnline ? 'bg-green-500' : 'bg-gray-500');
        }

        const statusText = cardSection.querySelector('.status-text');
        if (statusText) {
          statusText.textContent = newIsOnline ? 'Online' : 'Offline';
          statusText.classList.remove('bg-green-500/20', 'text-green-400', 'bg-gray-600', 'text-gray-300');
          if (newIsOnline) {
            statusText.classList.add('bg-green-500/20', 'text-green-400');
          } else {
            statusText.classList.add('bg-gray-600', 'text-gray-300');
          }
        }
      }
    });

    const cleanupOnNavigation = () => {
      if (statusUnsubscribe) {
        statusUnsubscribe();
        statusUnsubscribe = null;
      }
      window.removeEventListener('beforeunload', cleanupOnNavigation);
    };

    window.addEventListener('beforeunload', cleanupOnNavigation);
  }

  if (isOwnProfile) {
    const actionsSection = createOwnProfileActions(profileUser);
    container.appendChild(actionsSection);
  }

  const historySection = createMatchHistorySection(profileUser.id);
  container.appendChild(historySection);
}

function createOwnProfileActions(user: User): HTMLElement {
  const section = createElement('div', {
    className: 'bg-gray-800 rounded-lg p-6 mb-8',
  });

  const title = createElement('h2', {
    className: 'text-xl font-bold text-white mb-4',
    textContent: 'Profile Settings',
  });

  const actionsGrid = createElement('div', {
    className: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  });

  const changeNameBtn = createElement('button', {
    className: 'flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition',
  });

  const nameIcon = createElement('span', { textContent: '✏️' });
  const nameText = createElement('span', { textContent: 'Change display name' });
  changeNameBtn.appendChild(nameIcon);
  changeNameBtn.appendChild(nameText);

  changeNameBtn.addEventListener('click', () => openChangeNameModal(user));

  const changePhotoBtn = createElement('button', {
    className: 'flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition',
  });

  const photoIcon = createElement('span', { textContent: '📷' });
  const photoText = createElement('span', { textContent: 'Change profile picture' });
  changePhotoBtn.appendChild(photoIcon);
  changePhotoBtn.appendChild(photoText);

  changePhotoBtn.addEventListener('click', () => openChangePhotoModal());

  actionsGrid.appendChild(changeNameBtn);
  actionsGrid.appendChild(changePhotoBtn);

  section.appendChild(title);
  section.appendChild(actionsGrid);

  return section;
}

function openChangeNameModal(user: User): void {
  const form = createElement('form', {
    className: 'space-y-4',
  }) as HTMLFormElement;

  const label = createElement('label', {
    className: 'block text-sm font-medium text-gray-300 mb-2',
    textContent: 'New display name',
    attributes: { for: 'newDisplayName' },
  });

  const input = createElement('input', {
    className: 'appearance-none block w-full px-3 py-3 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500',
    attributes: {
      id: 'newDisplayName',
      name: 'newDisplayName',
      type: 'text',
      placeholder: user.displayName,
      value: user.displayName,
      required: 'true',
    },
  });

  form.appendChild(label);
  form.appendChild(input);

  const modal = showModal({
    title: 'Change display name',
    content: form,
    actions: [
      {
        label: 'Cancel',
        variant: 'secondary',
        onClick: () => modal.close(),
      },
      {
        label: 'Save',
        variant: 'primary',
        onClick: async () => {
          const formData = new FormData(form);
          const newName = (formData.get('newDisplayName') as string).trim();

          const validation = validateDisplayName(newName);
          if (!validation.valid) {
            showError(validation.error || 'Invalid name');
            return;
          }

          const loader = showLoader('Updating...');

          try {
            await userService.updateDisplayName(newName);
            hideLoader(loader);
            showSuccess('Display name updated!');
            modal.close();
            window.location.reload();
          } catch (error) {
            hideLoader(loader);
            const message = error instanceof Error ? error.message : 'Update error';
            showError(message);
          }
        },
      },
    ],
  });
}

function openChangePhotoModal(): void {
  const form = createElement('form', {
    className: 'space-y-4',
  }) as HTMLFormElement;

  const label = createElement('label', {
    className: 'block text-sm font-medium text-gray-300 mb-2',
    textContent: 'Select an image',
    attributes: { for: 'profilePicture' },
  });

  const input = createElement('input', {
    className: 'block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700',
    attributes: {
      id: 'profilePicture',
      name: 'profilePicture',
      type: 'file',
      accept: 'image/*',
      required: 'true',
    },
  });

  const hint = createElement('p', {
    className: 'text-xs text-gray-400',
    textContent: 'Format: JPG, PNG. Max size: 5MB',
  });

  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(hint);

  const modal = showModal({
    title: 'Change profile picture',
    content: form,
    actions: [
      {
        label: 'Cancel',
        variant: 'secondary',
        onClick: () => modal.close(),
      },
      {
        label: 'Upload',
        variant: 'primary',
        onClick: async () => {
          const formData = new FormData(form);
          const file = formData.get('profilePicture') as File;

          if (!file || !file.name || file.size === 0) {
            showError('Please select an image');
            return;
          }

          if (file.size > 10 * 1024 * 1024) {
            showError('Image is too large (max 10MB)');
            return;
          }

          const loader = showLoader('Uploading...');

          try {
            const result = await userService.uploadProfilePicture(file);
            hideLoader(loader);

            if (result.success) {
              showSuccess('Profile picture updated!');
              modal.close();
              window.location.reload();
            } else {
              showError('Upload failed');
            }
          } catch (error) {
            hideLoader(loader);
            console.error('Upload error:', error);
            const message = error instanceof Error ? error.message : 'Upload error';
            showError(message);
          }
        },
      },
    ],
  });
}

function createMatchHistorySection(userId: number): HTMLElement {
  const section = createElement('div', {
    className: 'bg-gray-800 rounded-lg p-6',
  });

  const header = createElement('div', {
    className: 'flex items-center justify-between mb-4',
  });

  const title = createElement('h2', {
    className: 'text-xl font-bold text-white',
    textContent: 'Match History',
  });

  const viewAllBtn = createElement('button', {
    className: 'text-primary-500 hover:text-primary-400 transition',
    textContent: 'View all →',
  });

  viewAllBtn.addEventListener('click', () => {
    router.navigate(`/match-history/${userId}`);
  });

  header.appendChild(title);
  header.appendChild(viewAllBtn);
  section.appendChild(header);

  const matchesContainer = createElement('div', {
    id: `match-history-${userId}`,
    className: 'space-y-3',
  });

  section.appendChild(matchesContainer);

  loadRecentMatches(matchesContainer, userId);

  return section;
}

async function loadRecentMatches(container: HTMLElement, userId: number): Promise<void> {
  const loader = Loader({ size: 'md' });
  container.appendChild(loader);

  try {
    const history = await userService.getUserGameHistory(userId);

    container.innerHTML = '';

    if (!history || history.length === 0) {
      const emptyText = createElement('p', {
        className: 'text-gray-400 text-center py-4',
        textContent: 'No matches yet',
      });
      container.appendChild(emptyText);
      return;
    }

    const recentMatches = history.slice(0, 5);

    recentMatches.forEach((match) => {
      const isPlayer1 = match.player1Id === userId;
      const isWinner = match.winnerId === userId;
      const opponentName = isPlayer1 ? match.player2DisplayName : match.player1DisplayName;
      const userScore = isPlayer1 ? match.player1Score : match.player2Score;
      const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;

      const matchItem = createElement('div', {
        className: `flex items-center justify-between p-3 rounded-lg ${
          isWinner ? 'bg-green-500/10 border-l-2 border-green-500' : 'bg-red-500/10 border-l-2 border-red-500'
        }`,
      });

      const resultDiv = createElement('div', {
        className: 'flex items-center gap-2',
      });

      const resultBadge = createElement('span', {
        className: 'text-lg',
        textContent: isWinner ? '🏆' : '💔',
      });

      const vsText = createElement('span', {
        className: 'text-white font-medium',
        textContent: `vs ${opponentName}`,
      });

      resultDiv.appendChild(resultBadge);
      resultDiv.appendChild(vsText);

      const scoreDiv = createElement('div', {
        className: `font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`,
        textContent: `${userScore} - ${opponentScore}`,
      });

      matchItem.appendChild(resultDiv);
      matchItem.appendChild(scoreDiv);
      container.appendChild(matchItem);
    });
  } catch (error) {
    container.innerHTML = '';
    console.error('Failed to load match history:', error);
    const emptyText = createElement('p', {
      className: 'text-gray-400 text-center py-4',
      textContent: 'No matches played',
    });
    container.appendChild(emptyText);
  }
}

function openAvatarModal(avatarUrl: string, displayName: string): void {
  const content = createElement('div', {
    className: 'flex flex-col items-center justify-center',
  });

  const imgContainer = createElement('div', {
    className: 'relative w-full flex justify-center items-center',
  });

  const img = createElement('img', {
    className: 'max-w-full max-h-[60vh] object-contain rounded-lg',
    attributes: {
      src: avatarUrl,
      alt: `${displayName}'s avatar`,
    },
  }) as HTMLImageElement;

  imgContainer.appendChild(img);
  content.appendChild(imgContainer);

  const modal = showModal({
    title: `${displayName}'s avatar`,
    content,
    size: 'lg',
    actions: [
      {
        label: 'Close',
        variant: 'secondary',
        onClick: () => modal.close(),
      },
    ],
  });
}
