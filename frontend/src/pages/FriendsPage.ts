import { createElement } from '@/utils/dom';
import { Navbar } from '@/components/Navbar';
import { Loader } from '@/components/Loader';
import { showError, showSuccess } from '@/components/Notification';
import { openCustomMatchModal } from '@/components/CustomMatchModal';
import { friendsService } from '@/services/FriendsService';
import { userService } from '@/services/UserService';
import { router } from '@/router';
import { refreshFriendsWidget } from '@/components/FriendsWidget';
import { Avatar } from '@/components/Avatar';
import { statusWebSocketService } from '@/services/StatusWebSocketService';
import type { User } from '@/types';

export function FriendsPage(): HTMLElement {
  const container = createElement('div', {
    className: 'min-h-screen bg-gray-900',
  });

  const navbar = Navbar();
  container.appendChild(navbar);

  const main = createElement('main', {
    className: 'pt-20 px-4 pb-12',
  });

  const maxWidth = createElement('div', {
    className: 'max-w-6xl mx-auto',
  });

  const header = createElement('div', {
    className: 'text-center mb-8',
  });

  const icon = createElement('div', {
    className: 'text-6xl mb-4',
    textContent: '👥',
  });

  const title = createElement('h1', {
    className: 'text-4xl font-bold text-white mb-2',
    textContent: 'My Friends',
  });

  const subtitle = createElement('p', {
    className: 'text-gray-400',
    textContent: 'Manage your friends list',
  });

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(subtitle);
  maxWidth.appendChild(header);

  const tabs = createTabs();
  maxWidth.appendChild(tabs);

  const contentContainer = createElement('div', {
    id: 'friends-content',
    className: 'mt-6',
  });
  maxWidth.appendChild(contentContainer);

  main.appendChild(maxWidth);
  container.appendChild(main);

  loadFriendsList(contentContainer);

  return container;
}

function createTabs(): HTMLElement {
  const tabsContainer = createElement('div', {
    className: 'flex gap-4 border-b border-gray-700',
  });

  const tabs = [
    { id: 'friends', label: 'Friends', icon: '✓' },
    { id: 'requests', label: 'Requests', icon: '📨' },
    { id: 'add', label: 'Add', icon: '+' },
  ];

  tabs.forEach((tab) => {
    const button = createElement('button', {
      className: 'px-6 py-3 text-white hover:text-primary-400 transition border-b-2 border-transparent hover:border-primary-400',
      id: `tab-${tab.id}`,
    });

    const icon = createElement('span', {
      className: 'mr-2',
      textContent: tab.icon,
    });

    const label = createElement('span', {
      textContent: tab.label,
    });

    button.appendChild(icon);
    button.appendChild(label);

    button.addEventListener('click', () => {
      document.querySelectorAll('[id^="tab-"]').forEach((t) => {
        t.classList.remove('border-primary-400', 'text-primary-400');
      });
      button.classList.add('border-primary-400', 'text-primary-400');

      const contentContainer = document.getElementById('friends-content');
      if (contentContainer) {
        if (tab.id === 'friends') {
          loadFriendsList(contentContainer);
        } else if (tab.id === 'requests') {
          loadPendingRequests(contentContainer);
        } else if (tab.id === 'add') {
          loadAddFriendForm(contentContainer);
        }
      }
    });

    tabsContainer.appendChild(button);
  });

  const firstTab = tabsContainer.querySelector('[id^="tab-"]');
  if (firstTab) {
    firstTab.classList.add('border-primary-400', 'text-primary-400');
  }

  return tabsContainer;
}

async function loadFriendsList(container: HTMLElement): Promise<void> {
  container.innerHTML = '';

  const loader = Loader({ size: 'xl' });
  container.appendChild(loader);

  try {
    const friendIds = await friendsService.getFriendsList();
    const status = await friendsService.getFriendsStatus();

    container.innerHTML = '';

    if (friendIds.length === 0) {
      const empty = createElement('div', {
        className: 'text-center py-12',
      });

      const emptyIcon = createElement('div', {
        className: 'text-6xl mb-4',
        textContent: '😔',
      });

      const emptyText = createElement('p', {
        className: 'text-gray-400 mb-6',
        textContent: 'You don\'t have any friends yet',
      });

      const addBtn = createElement('button', {
        className: 'px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition',
        textContent: 'Add friends',
      });

      addBtn.addEventListener('click', () => {
        document.getElementById('tab-add')?.click();
      });

      empty.appendChild(emptyIcon);
      empty.appendChild(emptyText);
      empty.appendChild(addBtn);
      container.appendChild(empty);
      return;
    }

    const friendsPromises = friendIds.map(async (id) => {
      try {
        const user = await userService.getUserById(id);
        return {
          ...user,
          isOnline: status[id] || false,
        };
      } catch (error) {
        console.error(`Failed to fetch user ${id}:`, error);
        return null;
      }
    });

    const friends = (await Promise.all(friendsPromises)).filter(
      (f): f is User & { isOnline: boolean } => f !== null
    );

    const grid = createElement('div', {
      className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    });

    const friendCards = new Map<number, HTMLElement>();

    friends.forEach((friend: any) => {
      const card = createFriendCard(friend);
      friendCards.set(friend.id, card);
      grid.appendChild(card);
    });

    container.appendChild(grid);

    const unsubscribe = statusWebSocketService.onStatusChange((userId: number, isOnline: boolean) => {
      const card = friendCards.get(userId);
      if (card) {
        const statusDot = card.querySelector('.status-dot');
        if (statusDot) {
          statusDot.classList.remove('bg-green-500', 'bg-gray-500');
          statusDot.classList.add(isOnline ? 'bg-green-500' : 'bg-gray-500');
        }

        const statusText = card.querySelector('.status-text');
        if (statusText) {
          statusText.textContent = isOnline ? 'Online' : 'Offline';
          statusText.classList.remove('text-green-400', 'text-gray-500');
          statusText.classList.add(isOnline ? 'text-green-400' : 'text-gray-500');
        }
      }
    });

    (grid as any).__statusUnsubscribe = unsubscribe;
  } catch (error) {
    container.innerHTML = '';
    showError('Unable to load friends list');
    const errorDiv = createElement('p', {
      className: 'text-center text-red-400 py-12',
      textContent: 'Error loading',
    });
    container.appendChild(errorDiv);
  }
}

function createFriendCard(friend: User & { isOnline: boolean }): HTMLElement {
  const card = createElement('div', {
    className: 'bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition',
  });

  const header = createElement('div', {
    className: 'flex items-center gap-3 mb-4',
  });

  const avatarContainer = createElement('div', {
    className: 'relative cursor-pointer',
  });

  avatarContainer.addEventListener('click', () => {
    router.navigate(`/profile/${friend.id}`);
  });

  const avatar = Avatar({ displayName: friend.displayName, src: friend.profilePicture, className: 'w-16 h-16' });

  const statusDot = createElement('div', {
    className: `status-dot absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-800 ${
      friend.isOnline ? 'bg-green-500' : 'bg-gray-500'
    }`,
  });

  avatarContainer.appendChild(avatar);
  avatarContainer.appendChild(statusDot);

  const nameDiv = createElement('div', {
    className: 'flex-1 min-w-0',
  });

  const name = createElement('div', {
    className: 'font-semibold text-white truncate',
    textContent: friend.displayName,
  });

  const username = createElement('div', {
    className: 'text-sm text-gray-400 truncate',
    textContent: `@${friend.userName}`,
  });

  const statusText = createElement('div', {
    className: `status-text text-xs ${friend.isOnline ? 'text-green-400' : 'text-gray-500'}`,
    textContent: friend.isOnline ? 'Online' : 'Offline',
  });

  nameDiv.appendChild(name);
  nameDiv.appendChild(username);
  nameDiv.appendChild(statusText);

  header.appendChild(avatarContainer);
  header.appendChild(nameDiv);
  card.appendChild(header);

  const actions = createElement('div', {
    className: 'flex gap-2',
  });

  const profileBtn = createElement('button', {
    className: 'flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm transition',
    textContent: 'Profile',
  });

  profileBtn.addEventListener('click', () => {
    router.navigate(`/profile/${friend.id}`);
  });

  const challengeBtn = createElement('button', {
    className: 'flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition',
    textContent: '🎮 Challenge',
  });

  challengeBtn.addEventListener('click', () => {
    openCustomMatchModal(friend);
  });

  const removeBtn = createElement('button', {
    className: 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition',
    textContent: '✕',
  });

  removeBtn.addEventListener('click', async () => {
    if (confirm(`Remove ${friend.displayName} from your friends?`)) {
      try {
        await friendsService.removeFriend(friend.id);
        showSuccess('Friend removed');
        refreshFriendsWidget();
        const container = document.getElementById('friends-content');
        if (container) {
          loadFriendsList(container);
        }
      } catch (error) {
        showError('Unable to remove this friend');
      }
    }
  });

  actions.appendChild(profileBtn);
  actions.appendChild(challengeBtn);
  actions.appendChild(removeBtn);
  card.appendChild(actions);

  return card;
}

async function loadPendingRequests(container: HTMLElement): Promise<void> {
  container.innerHTML = '';

  const loader = Loader({ size: 'xl' });
  container.appendChild(loader);

  try {
    const [receivedIds, sentIds] = await Promise.all([
      friendsService.getPendingReceivedRequests(),
      friendsService.getPendingSentRequests(),
    ]);

    container.innerHTML = '';

    const sectionsContainer = createElement('div', {
      className: 'space-y-8',
    });

    const receivedSection = createElement('div');
    const receivedTitle = createElement('h3', {
      className: 'text-xl font-bold text-white mb-4',
      textContent: `Received requests (${receivedIds.length})`,
    });
    receivedSection.appendChild(receivedTitle);

    if (receivedIds.length === 0) {
      const empty = createElement('p', {
        className: 'text-gray-400 text-center py-6',
        textContent: 'No requests received',
      });
      receivedSection.appendChild(empty);
    } else {
      const receivedGrid = createElement('div', {
        className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
      });

      const receivedUsers = await Promise.all(
        receivedIds.map(async (id) => {
          try {
            return await userService.getUserById(id);
          } catch (error) {
            console.error(`Failed to fetch user ${id}:`, error);
            return null;
          }
        })
      );

      receivedUsers.filter((u): u is User => u !== null).forEach((user) => {
        const card = createReceivedRequestCard(user);
        receivedGrid.appendChild(card);
      });

      receivedSection.appendChild(receivedGrid);
    }

    sectionsContainer.appendChild(receivedSection);

    const sentSection = createElement('div');
    const sentTitle = createElement('h3', {
      className: 'text-xl font-bold text-white mb-4',
      textContent: `Sent requests (${sentIds.length})`,
    });
    sentSection.appendChild(sentTitle);

    if (sentIds.length === 0) {
      const empty = createElement('p', {
        className: 'text-gray-400 text-center py-6',
        textContent: 'No requests sent',
      });
      sentSection.appendChild(empty);
    } else {
      const sentGrid = createElement('div', {
        className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
      });

      const sentUsers = await Promise.all(
        sentIds.map(async (id) => {
          try {
            return await userService.getUserById(id);
          } catch (error) {
            console.error(`Failed to fetch user ${id}:`, error);
            return null;
          }
        })
      );

      sentUsers.filter((u): u is User => u !== null).forEach((user) => {
        const card = createSentRequestCard(user);
        sentGrid.appendChild(card);
      });

      sentSection.appendChild(sentGrid);
    }

    sectionsContainer.appendChild(sentSection);
    container.appendChild(sectionsContainer);
  } catch (error) {
    container.innerHTML = '';
    showError('Unable to load requests');
    const errorDiv = createElement('p', {
      className: 'text-center text-red-400 py-12',
      textContent: 'Error loading',
    });
    container.appendChild(errorDiv);
  }
}

function createReceivedRequestCard(user: User): HTMLElement {
  const card = createElement('div', {
    className: 'bg-gray-800 rounded-lg p-6',
  });

  const header = createElement('div', {
    className: 'flex items-center gap-3 mb-4',
  });

  const avatarWrapper = createElement('div', {
    className: 'cursor-pointer',
  });

  avatarWrapper.addEventListener('click', () => {
    router.navigate(`/profile/${user.id}`);
  });

  const avatar = Avatar({ displayName: user.displayName, src: user.profilePicture, className: 'w-16 h-16' });
  avatarWrapper.appendChild(avatar);

  const nameDiv = createElement('div', {
    className: 'flex-1 min-w-0',
  });

  const name = createElement('div', {
    className: 'font-semibold text-white truncate',
    textContent: user.displayName,
  });

  const username = createElement('div', {
    className: 'text-sm text-gray-400 truncate',
    textContent: `@${user.userName}`,
  });

  nameDiv.appendChild(name);
  nameDiv.appendChild(username);

  header.appendChild(avatarWrapper);
  header.appendChild(nameDiv);
  card.appendChild(header);

  const actions = createElement('div', {
    className: 'flex gap-2',
  });

  const acceptBtn = createElement('button', {
    className: 'flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition',
    textContent: 'Accept',
  });

  acceptBtn.addEventListener('click', async () => {
    try {
      await friendsService.acceptFriendRequest(user.id);
      showSuccess(`${user.displayName} is now your friend!`);
      refreshFriendsWidget();
      const container = document.getElementById('friends-content');
      if (container) {
        loadPendingRequests(container);
      }
    } catch (error) {
      showError('Unable to accept request');
    }
  });

  const rejectBtn = createElement('button', {
    className: 'flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition',
    textContent: 'Reject',
  });

  rejectBtn.addEventListener('click', async () => {
    try {
      await friendsService.rejectFriendRequest(user.id);
      showSuccess('Request rejected');
      const container = document.getElementById('friends-content');
      if (container) {
        loadPendingRequests(container);
      }
    } catch (error) {
      showError('Unable to reject request');
    }
  });

  actions.appendChild(acceptBtn);
  actions.appendChild(rejectBtn);
  card.appendChild(actions);

  return card;
}

function createSentRequestCard(user: User): HTMLElement {
  const card = createElement('div', {
    className: 'bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition border-2 border-yellow-500',
  });

  const header = createElement('div', {
    className: 'flex items-center gap-3 mb-4',
  });

  const avatarWrapper = createElement('div', {
    className: 'cursor-pointer',
  });

  avatarWrapper.addEventListener('click', () => {
    router.navigate(`/profile/${user.id}`);
  });

  const avatar = Avatar({ displayName: user.displayName, src: user.profilePicture, className: 'w-16 h-16' });
  avatarWrapper.appendChild(avatar);

  const nameDiv = createElement('div', {
    className: 'flex-1 min-w-0',
  });

  const name = createElement('div', {
    className: 'font-semibold text-white truncate',
    textContent: user.displayName,
  });

  const username = createElement('div', {
    className: 'text-sm text-gray-400 truncate',
    textContent: `@${user.userName}`,
  });

  const status = createElement('div', {
    className: 'text-xs text-yellow-400',
    textContent: 'Pending...',
  });

  nameDiv.appendChild(name);
  nameDiv.appendChild(username);
  nameDiv.appendChild(status);

  header.appendChild(avatarWrapper);
  header.appendChild(nameDiv);
  card.appendChild(header);

  const actions = createElement('div', {
    className: 'flex gap-2',
  });

  const cancelBtn = createElement('button', {
    className: 'w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition',
    textContent: 'Cancel request',
  });

  cancelBtn.addEventListener('click', async () => {
    if (confirm(`Cancel request sent to ${user.displayName}?`)) {
      try {
        await friendsService.cancelFriendRequest(user.id);
        showSuccess('Request canceled');
        const container = document.getElementById('friends-content');
        if (container) {
          loadPendingRequests(container);
        }
      } catch (error) {
        showError('Unable to cancel request');
      }
    }
  });

  actions.appendChild(cancelBtn);
  card.appendChild(actions);

  return card;
}

function loadAddFriendForm(container: HTMLElement): void {
  container.innerHTML = '';

  const form = createElement('div', {
    className: 'max-w-md mx-auto bg-gray-800 rounded-lg p-6',
  });

  const title = createElement('h3', {
    className: 'text-xl font-bold text-white mb-4',
    textContent: 'Add a friend',
  });

  const description = createElement('p', {
    className: 'text-gray-400 mb-6',
    textContent: 'Search for a player by username to add them to your friends',
  });

  const input = createElement('input', {
    className: 'w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-primary-500 mb-4',
    attributes: {
      type: 'text',
      placeholder: 'Username...',
      id: 'search-friend-input',
    },
  }) as HTMLInputElement;

  const searchBtn = createElement('button', {
    className: 'w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition mb-6',
    textContent: 'Search',
  });

  const resultsContainer = createElement('div', {
    id: 'search-results',
    className: 'mt-4',
  });

  searchBtn.addEventListener('click', () => {
    searchFriend(input.value.trim(), resultsContainer);
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchFriend(input.value.trim(), resultsContainer);
    }
  });

  form.appendChild(title);
  form.appendChild(description);
  form.appendChild(input);
  form.appendChild(searchBtn);
  form.appendChild(resultsContainer);
  container.appendChild(form);
}

async function searchFriend(username: string, resultsContainer: HTMLElement): Promise<void> {
  resultsContainer.innerHTML = '';

  if (!username) {
    showError('Please enter a username');
    return;
  }

  const loader = Loader({ size: 'md' });
  resultsContainer.appendChild(loader);

  try {
    const leaderboard = await userService.getLeaderboard();
    const foundUser = leaderboard.find(
      (u) => u.displayName.toLowerCase() === username.toLowerCase()
    );

    resultsContainer.innerHTML = '';

    if (!foundUser) {
      const notFound = createElement('p', {
        className: 'text-gray-400 text-center py-4',
        textContent: 'No user found',
      });
      resultsContainer.appendChild(notFound);
      return;
    }

    const user = await userService.getUserById(foundUser.userId);

    const resultCard = createElement('div', {
      className: 'bg-gray-700 rounded-lg p-4 flex items-center justify-between',
    });

    const userInfo = createElement('div', {
      className: 'flex items-center gap-3',
    });

    const avatarWrapper = createElement('div', {
      className: 'cursor-pointer',
    });

    avatarWrapper.addEventListener('click', () => {
      router.navigate(`/profile/${user.id}`);
    });

    const avatar = Avatar({ displayName: user.displayName, src: user.profilePicture, className: 'w-12 h-12' });
    avatarWrapper.appendChild(avatar);

    const nameDiv = createElement('div');

    const name = createElement('div', {
      className: 'font-semibold text-white',
      textContent: user.displayName,
    });

    const usernameText = createElement('div', {
      className: 'text-sm text-gray-400',
      textContent: `@${user.userName}`,
    });

    nameDiv.appendChild(name);
    nameDiv.appendChild(usernameText);

    userInfo.appendChild(avatarWrapper);
    userInfo.appendChild(nameDiv);

    const addBtn = createElement('button', {
      className: 'px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded transition',
      textContent: 'Add',
    });

    addBtn.addEventListener('click', async () => {
      try {
        await friendsService.sendFriendRequest(user.id);
        showSuccess('Friend request sent! See the Requests tab');
        addBtn.disabled = true;
        addBtn.textContent = 'Request sent';
        addBtn.classList.remove('bg-primary-600', 'hover:bg-primary-700');
        addBtn.classList.add('bg-gray-600', 'cursor-not-allowed');

        setTimeout(() => {
          const requestsTab = document.getElementById('tab-requests');
          if (requestsTab) {
            requestsTab.click();
          }
        }, 1500);
      } catch (error) {
        showError('Unable to send request');
      }
    });

    resultCard.appendChild(userInfo);
    resultCard.appendChild(addBtn);
    resultsContainer.appendChild(resultCard);
  } catch (error) {
    resultsContainer.innerHTML = '';
    showError('Error during search');
  }
}
