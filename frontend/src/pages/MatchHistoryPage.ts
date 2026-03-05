import { createElement } from '@/utils/dom';
import { Navbar } from '@/components/Navbar';
import { Loader } from '@/components/Loader';
import { getUser } from '@/utils/storage';
import { router } from '@/router';
import { userService } from '@/services/UserService';
import type { GameHistory } from '@/types';

export function MatchHistoryPage(): HTMLElement {
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
    id: 'history-header',
    className: 'text-center mb-8',
  });
  maxWidth.appendChild(header);

  const historyContainer = createElement('div', {
    id: 'history-container',
  });
  maxWidth.appendChild(historyContainer);

  main.appendChild(maxWidth);
  container.appendChild(main);

  loadMatchHistory(historyContainer, header);

  return container;
}

async function loadMatchHistory(container: HTMLElement, headerContainer: HTMLElement): Promise<void> {
  const loaderContainer = createElement('div', {
    className: 'flex justify-center py-12',
  });
  const loader = Loader({ size: 'xl' });
  loaderContainer.appendChild(loader);
  container.appendChild(loaderContainer);

  try {
    const pathParts = window.location.pathname.split('/');
    const userIdParam = pathParts[pathParts.indexOf('match-history') + 1];
    const userId = userIdParam ? parseInt(userIdParam, 10) : undefined;

    const currentUser = getUser();
    const targetUserId = userId && !isNaN(userId) ? userId : currentUser?.id;

    if (!targetUserId) {
      throw new Error('User not found');
    }

    const targetUser = await userService.getUserById(targetUserId);
    const isOwnProfile = currentUser?.id === targetUserId;

    const icon = createElement('div', {
      className: 'text-6xl mb-4',
      textContent: '📜',
    });

    const title = createElement('h1', {
      className: 'text-4xl font-bold text-white mb-2',
      textContent: 'Match History',
    });

    const subtitle = createElement('p', {
      className: 'text-gray-400',
      textContent: isOwnProfile ? 'All your past matches' : `${targetUser.displayName}'s matches`,
    });

    headerContainer.appendChild(icon);
    headerContainer.appendChild(title);
    headerContainer.appendChild(subtitle);

    const history: GameHistory[] = await userService.getUserGameHistory(targetUserId);

    container.removeChild(loaderContainer);

    if (!history || history.length === 0) {
      const empty = createElement('div', {
        className: 'text-center py-12',
      });

      const emptyIcon = createElement('div', {
        className: 'text-6xl mb-4',
        textContent: '🎮',
      });

      const emptyText = createElement('p', {
        className: 'text-gray-400 mb-6',
        textContent: 'No matches yet',
      });

      const playBtn = createElement('button', {
        className: 'px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition',
        textContent: 'Play now',
      });

      playBtn.addEventListener('click', () => router.navigate('/pong'));

      empty.appendChild(emptyIcon);
      empty.appendChild(emptyText);
      empty.appendChild(playBtn);
      container.appendChild(empty);
      return;
    }

    displayMatchHistory(container, history, targetUserId, targetUser.displayName);
  } catch (error) {
    container.removeChild(loaderContainer);
    console.error('Error loading match history:', error);

    const empty = createElement('div', {
      className: 'text-center py-12',
    });

    const emptyIcon = createElement('div', {
      className: 'text-6xl mb-4',
      textContent: '🎮',
    });

    const emptyText = createElement('p', {
      className: 'text-gray-400 mb-6',
      textContent: 'No matches played',
    });

    const playBtn = createElement('button', {
      className: 'px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition',
      textContent: 'Play now',
    });

    playBtn.addEventListener('click', () => router.navigate('/pong'));

    empty.appendChild(emptyIcon);
    empty.appendChild(emptyText);
    empty.appendChild(playBtn);
    container.appendChild(empty);
  }
}

function displayMatchHistory(container: HTMLElement, history: GameHistory[], userId: number, userName: string): void {
  const list = createElement('div', {
    className: 'space-y-4',
  });

  history.forEach((match) => {
    const isPlayer1 = match.player1Id === userId;
    const isWinner = match.winnerId === userId;
    const opponentName = isPlayer1 ? match.player2DisplayName : match.player1DisplayName;
    const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
    const userScore = isPlayer1 ? match.player1Score : match.player2Score;
    const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;

    const matchCard = createElement('div', {
      className: `bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition ${
        isWinner ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
      }`,
    });


    const header = createElement('div', {
      className: 'flex items-center justify-between mb-4',
    });

    const dateDiv = createElement('div', {
      className: 'text-gray-400 text-sm',
    });

    const dateObj = new Date(match.startedAt);
    const dateStr = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const dateText = createElement('div', {
      textContent: dateStr,
    });
    const timeText = createElement('div', {
      textContent: timeStr,
      className: 'text-xs',
    });

    dateDiv.appendChild(dateText);
    dateDiv.appendChild(timeText);

    const resultBadge = createElement('div', {
      className: `px-4 py-2 rounded-full font-bold ${
        isWinner
          ? 'bg-green-500/20 text-green-400'
          : 'bg-red-500/20 text-red-400'
      }`,
      textContent: isWinner ? '🏆 Victory' : '💔 Defeat',
    });

    header.appendChild(dateDiv);
    header.appendChild(resultBadge);
    matchCard.appendChild(header);


    const scoreSection = createElement('div', {
      className: 'flex items-center justify-between',
    });


    const playerDiv = createElement('div', {
      className: 'flex items-center gap-3 flex-1',
    });

    const playerLabel = createElement('div', {
      className: 'text-white font-semibold',
      textContent: userName,
    });

    playerDiv.appendChild(playerLabel);

    const scoreDiv = createElement('div', {
      className: 'flex items-center gap-4 px-8',
    });

    const playerScoreDiv = createElement('div', {
      className: `text-4xl font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`,
      textContent: String(userScore),
    });

    const separator = createElement('div', {
      className: 'text-2xl text-gray-500',
      textContent: '-',
    });

    const opponentScoreDiv = createElement('div', {
      className: `text-4xl font-bold ${!isWinner ? 'text-green-400' : 'text-red-400'}`,
      textContent: String(opponentScore),
    });

    scoreDiv.appendChild(playerScoreDiv);
    scoreDiv.appendChild(separator);
    scoreDiv.appendChild(opponentScoreDiv);

    const opponentDiv = createElement('div', {
      className: 'flex items-center gap-3 flex-1 justify-end cursor-pointer hover:text-primary-400 transition',
    });

    const opponentNameDiv = createElement('div', {
      className: 'text-white font-semibold',
      textContent: opponentName,
    });

    opponentDiv.appendChild(opponentNameDiv);

    opponentDiv.addEventListener('click', () => {
      router.navigate(`/profile/${opponentId}`);
    });

    scoreSection.appendChild(playerDiv);
    scoreSection.appendChild(scoreDiv);
    scoreSection.appendChild(opponentDiv);
    matchCard.appendChild(scoreSection);

    list.appendChild(matchCard);
  });

  container.appendChild(list);
}
