import { createElement } from '@/utils/dom';
import { Navbar } from '@/components/Navbar';
import { Loader, LoaderDots } from '@/components/Loader';
import { showSuccess, showError } from '@/components/Notification';
import { router } from '@/router';
import { pongService } from '@/services/PongService';
import type { MatchmakingWSMessage } from '@/types';

export function PongMatchmakingPage(): HTMLElement {
  const container = createElement('div', {
    className: 'min-h-screen bg-gray-900',
  });

  
  const navbar = Navbar();
  container.appendChild(navbar);

  
  const main = createElement('main', {
    className: 'pt-20 px-4 pb-12',
  });

  const maxWidth = createElement('div', {
    className: 'max-w-2xl mx-auto',
  });

  const matchmakingContainer = createElement('div', {
    className: 'bg-gray-800 rounded-lg p-12 text-center',
  });

  const icon = createElement('div', {
    className: 'text-8xl mb-6',
    textContent: '🔍',
  });

  const title = createElement('h1', {
    className: 'text-3xl font-bold text-white mb-4',
    textContent: 'Looking for an opponent...',
  });

  const loadingDots = LoaderDots('Searching');
  const dotsContainer = createElement('div', {
    className: 'flex justify-center mb-8',
  });
  dotsContainer.appendChild(loadingDots);

  const status = createElement('p', {
    className: 'text-gray-400 mb-8',
    textContent: 'We are looking for an opponent of similar level',
  });

  const spinnerContainer = createElement('div', {
    className: 'flex justify-center mb-8',
  });
  const spinner = Loader({ size: 'xl', color: 'primary' });
  spinnerContainer.appendChild(spinner);

  const cancelBtn = createElement('button', {
    className: 'px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition',
    textContent: 'Cancel',
  });

  cancelBtn.addEventListener('click', () => {
    pongService.disconnectFromMatchmaking();
    router.navigate('/pong');
  });

  matchmakingContainer.appendChild(icon);
  matchmakingContainer.appendChild(title);
  matchmakingContainer.appendChild(dotsContainer);
  matchmakingContainer.appendChild(status);
  matchmakingContainer.appendChild(spinnerContainer);
  matchmakingContainer.appendChild(cancelBtn);

  maxWidth.appendChild(matchmakingContainer);
  main.appendChild(maxWidth);
  container.appendChild(main);

  
  startMatchmaking();

  return container;
}

function startMatchmaking(): void {
  try {
    const ws = pongService.connectToMatchmaking();

    ws.onMessage((message: MatchmakingWSMessage) => {
      switch (message.type) {
        case 'MATCH_FOUND':
          showSuccess(`Opponent found: ${message.opponentName} (${message.opponentElo} ELO)`);
          setTimeout(() => {
            pongService.disconnectFromMatchmaking();
            router.navigate(`/pong/game/${message.gameId}`);
          }, 1500);
          break;

        case 'MATCHMAKING_CANCELLED':
          router.navigate('/pong');
          break;

        case 'ERROR':
          showError(message.message || 'Matchmaking error');
          setTimeout(() => {
            router.navigate('/pong');
          }, 2000);
          break;
      }
    });

    ws.onError((error) => {
      console.error('Matchmaking WebSocket error:', error);
      showError('Connection error to matchmaking');
      setTimeout(() => {
        router.navigate('/pong');
      }, 2000);
    });

  } catch (error) {
    console.error('Failed to start matchmaking:', error);
    showError('Unable to connect to matchmaking');
    setTimeout(() => {
      router.navigate('/pong');
    }, 2000);
  }
}

