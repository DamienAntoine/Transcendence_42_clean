import { createElement } from '@/utils/dom';
import { router } from '@/router';
import { showError, showSuccess } from '@/components/Notification';
import { pongService } from '@/services/PongService';
import { getUser } from '@/utils/storage';
import type { PongWSMessage, PongGameState, PowerUp } from '@/types';
import { PowerUpType } from '@/types';

export function PongGamePage(): HTMLElement {
  const pathParts = window.location.pathname.split('/');
  const gameId = pathParts[pathParts.length - 1];

  const urlParams = new URLSearchParams(window.location.search);
  const tournamentId = urlParams.get('tournamentId');

  if (!gameId) {
    showError('Game ID missing');
    router.navigate('/pong');
    return createElement('div');
  }

  const currentUser = getUser();
  let currentUserId: number | null = currentUser ? currentUser.id : null;
  let gameState: PongGameState | null = null;
  let playerNames: { [key: number]: string } = {};
  let animationFrameId: number | null = null;
  let keysPressed: Set<string> = new Set();
  let inputInterval: ReturnType<typeof setInterval> | null = null;
  const shieldUntil: Map<number, number> = new Map();
  let gameOverShown = false;

  console.log('PongGamePage - Current user ID:', currentUserId);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const FIELD_WIDTH = 100;
  const FIELD_HEIGHT = 100;

  const toPixelX = (x: number) => (x / FIELD_WIDTH) * CANVAS_WIDTH;
  const toPixelY = (y: number) => (y / FIELD_HEIGHT) * CANVAS_HEIGHT;

  const container = createElement('div', {
    className: 'min-h-screen bg-black flex flex-col items-center justify-center',
  });

  const infoBar = createElement('div', {
    className: 'w-full bg-gray-900 py-4 px-8 flex justify-between items-center',
  });

  const player1Info = createElement('div', {
    className: 'text-white text-lg',
    textContent: 'Player 1: 0',
  });

  const statusInfo = createElement('div', {
    className: 'text-primary-500 text-xl font-bold',
    textContent: 'Waiting...',
  });

  const player2Info = createElement('div', {
    className: 'text-white text-lg',
    textContent: 'Player 2: 0',
  });

  infoBar.appendChild(player1Info);
  infoBar.appendChild(statusInfo);
  infoBar.appendChild(player2Info);

  const gameContainer = createElement('div', {
    className: 'relative flex-1 flex items-center justify-center',
  });

  const canvas = createElement('canvas', {
    className: 'border-2 border-primary-600',
    attributes: {
      width: '800',
      height: '600',
    },
  }) as HTMLCanvasElement;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    showError('Canvas not supported');
    router.navigate('/pong');
    return createElement('div');
  }

  gameContainer.appendChild(canvas);

  const controlsHint = createElement('div', {
    className: 'absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-80 px-6 py-3 rounded-lg text-gray-300 text-sm',
    textContent: '⬆️ ⬇️ Move paddle • ESC Quit',
  });

  gameContainer.appendChild(controlsHint);

  container.appendChild(infoBar);
  container.appendChild(gameContainer);

  connectToGame();

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  window.addEventListener('beforeunload', cleanup);

  function connectToGame() {
    try {
      const ws = pongService.connectToGame(gameId);

      ws.onMessage((message: PongWSMessage) => {
        handleGameMessage(message);
      });

      ws.onError((error) => {
        console.error('Game WebSocket error:', error);
        showError('Game connection error');
        setTimeout(() => router.navigate('/pong'), 2000);
      });

      ws.onStateChange((state) => {
        console.log('WebSocket state:', state);
      });

    } catch (error) {
      console.error('Failed to connect to game:', error);
      showError('Unable to connect to game');
      setTimeout(() => router.navigate('/pong'), 2000);
    }
  }

  function handleGameMessage(message: PongWSMessage) {
    switch (message.type) {
      case 'GAME_STATE':
        gameState = message.state;
        updateUI();
        render();
        break;

      case 'PLAYER_JOINED':
        playerNames[message.playerId] = message.displayName;
        if (currentUserId === null) {
          currentUserId = message.playerId;
        }
        updateUI();
        break;

      case 'GAME_OVER':

        gameState = { ...message.state, status: 'finished' };
        render();

        const playerIds = Object.keys(gameState.scores).map(Number);
        const score1 = gameState.scores[playerIds[0]] || 0;
        const score2 = gameState.scores[playerIds[1]] || 0;
        showGameOver(message.winnerId, score1, score2);
        break;

      case 'PLAYER_LEFT':
        showError('Un joueur a quitté la partie');
        setTimeout(() => {
          if (tournamentId) {
            router.navigate(`/tournaments/${tournamentId}`);
          } else {
            router.navigate('/pong');
          }
        }, 2000);
        break;

      case 'POWER_UP_ACTIVATED':
        if (message.powerUpType === PowerUpType.SHIELD) {
          shieldUntil.set(message.playerId, Date.now() + message.duration);
        }
        break;

      case 'POWER_UP_EXPIRED':
        if (message.effectType === PowerUpType.SHIELD) {
          shieldUntil.delete(message.playerId);
        }
        break;

      case 'ERROR':
        showError(message.message || 'Erreur de jeu');
        break;


      case 'MATCH_FORFEIT' as any:
        showSuccess('Opponent forfeited. You win!');
        setTimeout(() => {
          cleanup();
          if (tournamentId) {
            router.navigate(`/tournaments/${tournamentId}`);
          } else {
            router.navigate('/pong');
          }
        }, 1500);
        break;
    }
  }


  function updateUI() {
    if (!gameState) return;

    const playerIds = Object.keys(gameState.scores).map(Number);
    const p1Id = playerIds[0];
    const p2Id = playerIds[1];

    if (p1Id !== undefined) {
      const name = playerNames[p1Id] || `Player ${p1Id}`;
      player1Info.textContent = `${name}: ${gameState.scores[p1Id] || 0}`;
    }

    if (p2Id !== undefined) {
      const name = playerNames[p2Id] || `Player ${p2Id}`;
      player2Info.textContent = `${name}: ${gameState.scores[p2Id] || 0}`;
    }

    switch (gameState.status) {
      case 'waiting':
        statusInfo.textContent = 'Waiting...';
        statusInfo.className = 'text-yellow-500 text-xl font-bold';
        break;
      case 'countdown':
        statusInfo.textContent = `${gameState.countdown || 3}`;
        statusInfo.className = 'text-primary-500 text-3xl font-bold';
        break;
      case 'playing':
        statusInfo.textContent = 'PLAYING';
        statusInfo.className = 'text-green-500 text-xl font-bold';
        break;
      case 'finished':
        statusInfo.textContent = 'FINISHED';
        statusInfo.className = 'text-red-500 text-xl font-bold';
        break;
    }
  }

  function render() {
    if (!ctx || !gameState) return;


    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);


    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);


    const ballX = toPixelX(gameState.ball.x);
    const ballY = toPixelY(gameState.ball.y);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
    ctx.fill();


    const playerIds = Object.keys(gameState.paddles).map(Number);
    playerIds.forEach((playerId, index) => {
      const paddle = gameState!.paddles[playerId];
      const backendHeight = paddle.height || 20;
      const paddleHeight = toPixelY(backendHeight);
      const paddleWidth = toPixelX(2);


      const x = index === 0 ? toPixelX(2) : toPixelX(96);


      const yTop = toPixelY(paddle.y - backendHeight / 2);

      ctx.fillStyle = playerId === currentUserId ? '#3b82f6' : '#ef4444';
      ctx.fillRect(x, yTop, paddleWidth, paddleHeight);


      let hasShield = false;
      const now = Date.now();

      if (gameState && gameState.activeEffects && gameState.activeEffects.length > 0) {
        hasShield = gameState.activeEffects.some(
          (e) => String(e.type).toLowerCase() === 'shield' && Number((e as any).playerId) === playerId
        );
      }

      if (!hasShield) {
        const until = shieldUntil.get(playerId);
        if (until && until > now) hasShield = true;
      }

      if (hasShield) {

        const lineWidth = 8;
        const shieldX = index === 0 ? (lineWidth / 2) : (CANVAS_WIDTH - lineWidth / 2);
        const yTopShield = 0;
        const yBotShield = CANVAS_HEIGHT;



        console.debug('[SHIELD] draw at', { playerId, shieldX, yTop: yTopShield, yBot: yBotShield, canvasW: CANVAS_WIDTH, canvasH: CANVAS_HEIGHT });

        ctx.save();
        ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = lineWidth;
        ctx.shadowColor = '#00ff00';
  ctx.shadowBlur = 22;
        ctx.beginPath();
  ctx.moveTo(shieldX, yTopShield);
  ctx.lineTo(shieldX, yBotShield);
        ctx.stroke();
        ctx.restore();


        ctx.save();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 16;
        ctx.strokeRect(x - 3, yTop - 3, paddleWidth + 6, paddleHeight + 6);
        ctx.restore();
      }
    });


    if (gameState.powerUps) {
      gameState.powerUps.forEach((powerUp: PowerUp) => {
        if (powerUp.active) {
          const powerUpX = toPixelX(powerUp.x);
          const powerUpY = toPixelY(powerUp.y);
          const powerUpWidth = toPixelX(powerUp.width || 3);
          const powerUpHeight = toPixelY(powerUp.height || 3);

          ctx.fillStyle = powerUp.type === 'big_paddle' ? '#fbbf24' : '#8b5cf6';
          ctx.fillRect(powerUpX, powerUpY, powerUpWidth, powerUpHeight);
        }
      });
    }


    if (gameState.status === 'countdown' && gameState.countdown > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gameState.countdown.toString(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
  }


  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cleanup();
      if (tournamentId) {
        router.navigate(`/tournaments/${tournamentId}`);
      } else {
        router.navigate('/pong');
      }
      return;
    }

    if (!currentUserId || !gameState || gameState.status !== 'playing') {
      return;
    }


    if (keysPressed.has(e.key)) {
      return;
    }

    keysPressed.add(e.key);

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();


      if (!inputInterval) {
        sendPaddleMovement();
        inputInterval = setInterval(sendPaddleMovement, 50);
      }
    }
  }


  function handleKeyUp(e: KeyboardEvent) {
    keysPressed.delete(e.key);


    if (!keysPressed.has('ArrowUp') && !keysPressed.has('ArrowDown')) {
      if (inputInterval) {
        clearInterval(inputInterval);
        inputInterval = null;
      }
    }
  }


  function sendPaddleMovement() {
    if (!currentUserId || !gameState || gameState.status !== 'playing') {
      return;
    }

    if (keysPressed.has('ArrowUp')) {
      pongService.movePaddleUp(currentUserId);
    } else if (keysPressed.has('ArrowDown')) {
      pongService.movePaddleDown(currentUserId);
    }
  }


  function showGameOver(winnerId: number, score1: number, score2: number) {

    if (gameOverShown) return;
    gameOverShown = true;

    const overlay = createElement('div', {
      className: 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-80',
    });

    const panel = createElement('div', {
      className: 'bg-gray-800 rounded-lg p-8 text-center space-y-6 max-w-md',
    });

    const title = createElement('h2', {
      className: 'text-4xl font-bold text-white mb-4',
      textContent: winnerId === currentUserId ? '🎉 VICTORY!' : '😢 DEFEAT',
    });

    const scoreText = createElement('p', {
      className: 'text-2xl text-gray-300',
      textContent: `Final score: ${score1} - ${score2}`,
    });

    const backBtn = createElement('button', {
      className: 'px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition',
      textContent: 'Back to menu',
    });

    backBtn.addEventListener('click', () => {
      cleanup();
      if (tournamentId) {
        router.navigate(`/tournaments/${tournamentId}`);
      } else {
        router.navigate('/pong');
      }
    });

    panel.appendChild(title);
    panel.appendChild(scoreText);
    panel.appendChild(backBtn);
    overlay.appendChild(panel);
    gameContainer.appendChild(overlay);

    if (winnerId === currentUserId) {
      showSuccess('Congratulations!');
    }
  }

  function cleanup() {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('beforeunload', cleanup);

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }

    if (inputInterval !== null) {
      clearInterval(inputInterval);
      inputInterval = null;
    }

    pongService.disconnectFromGame();
  }

  return container;
}
