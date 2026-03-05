import { createElement } from '@/utils/dom';
import { Navbar } from '@/components/Navbar';
import { UserCard } from '@/components/UserCard';
import { Loader } from '@/components/Loader';
import { showError } from '@/components/Notification';
import { getUser } from '@/utils/storage';
import { userService } from '@/services/UserService';
import { friendsService } from '@/services/FriendsService';
import { statusWebSocketService } from '@/services/StatusWebSocketService';
import { router } from '@/router';
import type { User } from '@/types';

export function HomePage(): HTMLElement {
  const container = createElement('div', {
    className: 'min-h-screen bg-gray-900',
  });

  const navbar = Navbar();
  container.appendChild(navbar);

  const main = createElement('main', {
    className: 'pt-20 px-4 pb-12',
  });

  const maxWidth = createElement('div', {
    className: 'max-w-7xl mx-auto',
  });

  const hero = createHeroSection();
  maxWidth.appendChild(hero);

  const statsContainer = createElement('div', {
    id: 'stats-section',
  });
  maxWidth.appendChild(statsContainer);
  loadStatsSection(statsContainer);

  const actions = createQuickActions();
  maxWidth.appendChild(actions);

  const topPlayers = createElement('div', {
    id: 'top-players-section',
  });
  maxWidth.appendChild(topPlayers);
  loadTopPlayers(topPlayers);

  main.appendChild(maxWidth);
  container.appendChild(main);

  return container;
}

function createHeroSection(): HTMLElement {
  const user = getUser();

  const section = createElement('div', {
    className: 'text-center py-12',
  });

  const greeting = createElement('h1', {
    className: 'text-5xl font-bold text-white mb-4',
    textContent: user ? `Welcome, ${user.displayName}!` : 'Welcome to Transcendence!',
  });

  const subtitle = createElement('p', {
    className: 'text-xl text-gray-400 mb-8',
    textContent: 'The best multiplayer Pong game',
  });

  const emoji = createElement('div', {
    className: 'text-8xl mb-6',
    textContent: '🏓',
  });

  section.appendChild(emoji);
  section.appendChild(greeting);
  section.appendChild(subtitle);

  return section;
}

async function loadStatsSection(container: HTMLElement): Promise<void> {
  const loader = Loader();
  container.appendChild(loader);

  try {
    const statsSection = await createStatsSection();
    container.innerHTML = '';
    container.appendChild(statsSection);
  } catch (error) {
    console.error('Failed to load stats section:', error);
    container.innerHTML = '';
    const statsSection = await createStatsSection();
    container.appendChild(statsSection);
  }
}

async function createStatsSection(): Promise<HTMLElement> {
  const user = getUser();
  if (!user) {
    return createElement('div');
  }

  const section = createElement('div', {
    className: 'grid grid-cols-1 md:grid-cols-4 gap-6 mb-12',
  });

  let wins = 0;
  let losses = 0;
  let total = 0;

  try {
    const stats = await userService.getUserStats(user.id);
    wins = stats.wins;
    losses = stats.losses;
    total = stats.gamesPlayed;
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    wins = user.wins ?? 0;
    losses = user.losses ?? 0;
    total = wins + losses;
  }

  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'ELO', value: user.elo, icon: '⭐', color: 'text-yellow-400' },
    { label: 'Wins', value: wins, icon: '🏆', color: 'text-green-400' },
    { label: 'Losses', value: losses, icon: '💔', color: 'text-red-400' },
    { label: 'Win Rate', value: `${winRate}%`, icon: '📊', color: 'text-blue-400' },
  ];

  stats.forEach((stat) => {
    const card = createElement('div', {
      className: 'bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition',
    });

    const icon = createElement('div', {
      className: 'text-4xl mb-3',
      textContent: stat.icon,
    });

    const value = createElement('div', {
      className: `text-3xl font-bold ${stat.color} mb-2`,
      textContent: String(stat.value),
    });

    const label = createElement('div', {
      className: 'text-gray-400 text-sm',
      textContent: stat.label,
    });

    card.appendChild(icon);
    card.appendChild(value);
    card.appendChild(label);
    section.appendChild(card);
  });

  return section;
}

function createQuickActions(): HTMLElement {
  const section = createElement('div', {
    className: 'mb-12',
  });

  const title = createElement('h2', {
    className: 'text-2xl font-bold text-white mb-6',
    textContent: 'Quick Actions',
  });

  const actionsGrid = createElement('div', {
    className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
  });

  const actions = [
    {
      label: 'Play Pong',
      icon: '/imgs/pong.png',
      color: 'bg-primary-600 hover:bg-primary-700',
      route: '/pong',
    },
    {
      label: 'Tournaments',
	  icon: '/imgs/tournament.png',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      route: '/tournaments',
    },
    {
      label: 'Chat',
      icon: '/imgs/chat.png',
      color: 'bg-blue-600 hover:bg-blue-700',
      route: '/chat',
    },
    {
      label: 'Leaderboard',
      icon: '/imgs/leaderboard.png',
      color: 'bg-green-600 hover:bg-green-700',
      route: '/leaderboard',
    },
  ];

  actions.forEach((action) => {
    const button = createElement('button', {
      className: `${action.color} text-white rounded-lg p-6 text-center transition transform hover:scale-105`,
    });

    const iconContainer = createElement('div', {
      className: 'text-5xl mb-3 flex justify-center items-center',
    });

    if (action.icon && action.icon.startsWith('/')) {
      const img = createElement('img', {
        className: 'w-16 h-16 object-contain',
        attributes: {
          src: action.icon,
          alt: action.label,
        },
      }) as HTMLImageElement;
      iconContainer.appendChild(img);
    } else if (action.icon) {
      iconContainer.textContent = action.icon;
    }

    const label = createElement('div', {
      className: 'text-lg font-semibold',
      textContent: action.label,
    });

    button.addEventListener('click', () => {
      router.navigate(action.route);
    });

    button.appendChild(iconContainer);
    button.appendChild(label);
    actionsGrid.appendChild(button);
  });

  section.appendChild(title);
  section.appendChild(actionsGrid);

  return section;
}

async function loadTopPlayers(container: HTMLElement): Promise<void> {
  const section = createElement('div');

  const title = createElement('h2', {
    className: 'text-2xl font-bold text-white mb-6',
    textContent: 'Top Players',
  });
  section.appendChild(title);

  const loader = Loader({ size: 'lg' });
  const loaderContainer = createElement('div', {
    className: 'flex justify-center py-12',
  });
  loaderContainer.appendChild(loader);
  section.appendChild(loaderContainer);

  container.appendChild(section);

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

    section.removeChild(loaderContainer);

    if (leaderboard.length === 0) {
      const empty = createElement('p', {
        className: 'text-center text-gray-400 py-12',
        textContent: 'No players yet',
      });
      section.appendChild(empty);
      return;
    }

    const grid = createElement('div', {
      className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4',
    });

    const playerCards = new Map<number, HTMLElement>();

    leaderboard.forEach((player) => {
      let isOnline = false;

      if (currentUser && player.userId === currentUser.id) {
        isOnline = true;
      } else if (friendIds.includes(player.userId)) {
        isOnline = onlineStatus[player.userId] || false;
      }

      const userWithOnline: User & { isOnline?: boolean } = {
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

      const card = UserCard({
        user: userWithOnline,
        showStats: true,
        showActions: false,
      });

      playerCards.set(player.userId, card);
      grid.appendChild(card);
    });

    section.appendChild(grid);

    const statusUnsubscribe = statusWebSocketService.onStatusChange((userId, isOnline) => {
      if (playerCards.has(userId) && friendIds.includes(userId)) {
        const card = playerCards.get(userId);
        if (card) {
          const statusDot = card.querySelector('.status-dot');
          if (statusDot) {
            if (isOnline) {
              statusDot.classList.remove('bg-gray-400');
              statusDot.classList.add('bg-green-500');
            } else {
              statusDot.classList.remove('bg-green-500');
              statusDot.classList.add('bg-gray-400');
            }
          }
        }
      }
    });

    (section as any).__statusUnsubscribe = statusUnsubscribe;

    const viewAllDiv = createElement('div', {
      className: 'text-center mt-6',
    });

    const viewAllBtn = createElement('button', {
      className: 'text-primary-500 hover:text-primary-400 font-medium transition',
      textContent: 'View full leaderboard →',
    });

    viewAllBtn.addEventListener('click', () => {
      router.navigate('/leaderboard');
    });

    viewAllDiv.appendChild(viewAllBtn);
    section.appendChild(viewAllDiv);
  } catch (error) {
    section.removeChild(loaderContainer);
    const message = error instanceof Error ? error.message : 'Error loading';
    showError(message);

    const errorDiv = createElement('p', {
      className: 'text-center text-red-400 py-12',
      textContent: 'Unable to load top players',
    });
    section.appendChild(errorDiv);
  }
}
