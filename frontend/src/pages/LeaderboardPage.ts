import { createElement } from '@/utils/dom';
import { Navbar } from '@/components/Navbar';
import { UserCardMini } from '@/components/UserCard';
import { Loader } from '@/components/Loader';
import { showError } from '@/components/Notification';
import { userService } from '@/services/UserService';
import { friendsService } from '@/services/FriendsService';
import { getUser } from '@/utils/storage';
import { router } from '@/router';
import type { User, UserLeaderboardRow } from '@/types';

export function LeaderboardPage(): HTMLElement {
  const container = createElement('div', {
    className: 'min-h-screen bg-gray-900',
  });

  const navbar = Navbar();
  container.appendChild(navbar);

  const main = createElement('main', {
    className: 'pt-20 px-4 pb-12',
  });

  const maxWidth = createElement('div', {
    className: 'max-w-4xl mx-auto',
  });

  const header = createElement('div', {
    className: 'text-center mb-8',
  });

  const icon = createElement('div', {
    className: 'text-6xl mb-4',
    textContent: '🏆',
  });

  const title = createElement('h1', {
    className: 'text-4xl font-bold text-white mb-2',
    textContent: 'ELO Leaderboard',
  });

  const subtitle = createElement('p', {
    className: 'text-gray-400',
    textContent: 'The best Transcendence players',
  });

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(subtitle);
  maxWidth.appendChild(header);

  const leaderboardContainer = createElement('div', {
    id: 'leaderboard-container',
  });
  maxWidth.appendChild(leaderboardContainer);

  main.appendChild(maxWidth);
  container.appendChild(main);

  loadLeaderboard(leaderboardContainer);

  return container;
}

async function loadLeaderboard(container: HTMLElement): Promise<void> {
  const loaderContainer = createElement('div', {
    className: 'flex justify-center py-12',
  });
  const loader = Loader({ size: 'xl' });
  loaderContainer.appendChild(loader);
  container.appendChild(loaderContainer);

  try {
    const leaderboard = await userService.getLeaderboard();
    const currentUser = getUser();

    let onlineStatus: { [userId: number]: boolean } = {};
    let friendIds: number[] = [];

    try {
      friendIds = await friendsService.getFriendsList();
      onlineStatus = await friendsService.getFriendsStatus();
    } catch (error) {
      console.error('Failed to fetch online status:', error);
    }

    container.removeChild(loaderContainer);

    if (leaderboard.length === 0) {
      const empty = createElement('p', {
        className: 'text-center text-gray-400 py-12',
        textContent: 'No players yet',
      });
      container.appendChild(empty);
      return;
    }

    displayLeaderboard(container, leaderboard, currentUser, friendIds, onlineStatus);
  } catch (error) {
    container.removeChild(loaderContainer);
    const message = error instanceof Error ? error.message : 'Error loading';
    showError(message);

    const errorDiv = createElement('p', {
      className: 'text-center text-red-400 py-12',
      textContent: 'Unable to load leaderboard',
    });
    container.appendChild(errorDiv);
  }
}

function displayLeaderboard(
  container: HTMLElement,
  leaderboard: UserLeaderboardRow[],
  currentUser: User | null,
  friendIds: number[],
  onlineStatus: { [userId: number]: boolean }
): void {
  const list = createElement('div', {
    className: 'space-y-3',
  });

  leaderboard.forEach((player, index) => {
    const rank = index + 1;
    const isTopThree = rank <= 3;

    const item = createElement('div', {
      className: `flex items-center gap-4 p-4 rounded-lg transition ${
        isTopThree ? 'bg-gradient-to-r from-yellow-600 to-yellow-800' : 'bg-gray-800 hover:bg-gray-750'
      }`,
    });

    
    const rankDiv = createElement('div', {
      className: 'flex-shrink-0 w-12 text-center',
    });

    const rankText = createElement('div', {
      className: `text-2xl font-bold ${isTopThree ? 'text-white' : 'text-gray-400'}`,
      textContent: `${rank}`,
    });

    if (rank === 1) {
      const crown = createElement('div', {
        className: 'text-3xl',
        textContent: '👑',
      });
      rankDiv.appendChild(crown);
    } else if (rank === 2) {
      const medal = createElement('div', {
        className: 'text-3xl',
        textContent: '🥈',
      });
      rankDiv.appendChild(medal);
    } else if (rank === 3) {
      const medal = createElement('div', {
        className: 'text-3xl',
        textContent: '🥉',
      });
      rankDiv.appendChild(medal);
    } else {
      rankDiv.appendChild(rankText);
    }

    item.appendChild(rankDiv);

    let isOnline = false;

    if (currentUser && player.userId === currentUser.id) {
      isOnline = true;
    } else if (friendIds.includes(player.userId)) {
      isOnline = onlineStatus[player.userId] || false;
    }

    const userForCard: User & { isOnline?: boolean } = {
      id: player.userId,
      userName: '',
      displayName: player.displayName,
      profilePicture: player.profilePicture,
      elo: player.elo,
      wins: player.wins,
      losses: player.losses,
      gamesPlayed: player.gamesPlayed,
      createdAt: '',
      isOnline,
    };

    const card = UserCardMini(userForCard, (userId) => {
      router.navigate(`/profile/${userId}`);
    });

    if (isTopThree) {
      card.className = card.className.replace('bg-gray-800', 'bg-transparent');
    }

    item.appendChild(card);

    const eloDiv = createElement('div', {
      className: 'flex-shrink-0 text-right',
    });

    const eloValue = createElement('div', {
      className: `text-2xl font-bold ${isTopThree ? 'text-white' : 'text-primary-400'}`,
      textContent: `${player.elo}`,
    });

    const eloLabel = createElement('div', {
      className: `text-xs ${isTopThree ? 'text-gray-200' : 'text-gray-500'}`,
      textContent: 'ELO',
    });

    eloDiv.appendChild(eloValue);
    eloDiv.appendChild(eloLabel);
    item.appendChild(eloDiv);

    list.appendChild(item);
  });

  container.appendChild(list);
}
