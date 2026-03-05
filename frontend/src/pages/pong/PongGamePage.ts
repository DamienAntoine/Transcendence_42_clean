

import { router } from '@/router/Router';
import { pongService } from '@/services/PongService';
import { PongGameState } from '@/types/Pong';
import { PowerUpType } from '@/types';
import { PongRenderer } from './PongRenderer';
import { showSuccess, showError } from '@/components/Notification';
import type { WebSocketManager } from '@/services/WebSocketManager';
import type { PongWSMessage, MatchmakingWSMessage } from '@/types';


interface PongGamePageParams {
  mode?: string;
  gameId?: string;
  roomId?: string;
  tournamentId?: string;
}


export class PongGamePage {
  private container: HTMLElement | null = null;
  private renderer: PongRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private params: PongGamePageParams = {};


  private playerIds: [number, number] = [1, 2];
  private myPlayerId: number | null = null;

  private shieldUntil: Map<number, number> = new Map();


  private gameWs: WebSocketManager<PongWSMessage> | null = null;
  private matchmakingWs: WebSocketManager<MatchmakingWSMessage> | null = null;


  private controlsEnabled = false;


  private overlayElement: HTMLElement | null = null;


  mount(containerId: string): void {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Container not found');
      return;
    }


    this.extractParams();


    this.render();


    this.initCanvas();


    this.connectToGame();


    this.setupKeyboardControls();
  }


  unmount(): void {
    if (this.renderer) {
      this.renderer.stop();
      this.renderer = null;
    }


    pongService.disconnectFromGame();
    pongService.disconnectFromMatchmaking();


    this.removeKeyboardControls();


    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }

    this.canvas = null;
    this.gameWs = null;
    this.matchmakingWs = null;
  }


  private extractParams(): void {
    const pathParts = window.location.pathname.split('/');
    let gameIdFromPath = pathParts[pathParts.length - 1];

    if (gameIdFromPath && gameIdFromPath.includes('?')) {
      gameIdFromPath = gameIdFromPath.split('?')[0];
    }

    const urlParams = new URLSearchParams(window.location.search);
    this.params = {
      mode: urlParams.get('mode') || 'matchmaking',
      gameId: gameIdFromPath && gameIdFromPath !== 'game' ? gameIdFromPath : undefined,
      roomId: urlParams.get('roomId') || undefined,
      tournamentId: urlParams.get('tournamentId') || undefined,
    };

    console.log('[PongGamePage] Extracted params:', this.params);
    console.log('[PongGamePage] URL:', window.location.href);
  }


  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col">
        <!-- Header -->
        <div class="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4">
          <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div class="flex items-center gap-4">
              <button id="backBtn" class="text-gray-400 hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 class="text-2xl font-bold text-white">Pong Game</h1>
            </div>

            <div class="flex items-center gap-4">
              <div id="connectionStatus" class="flex items-center gap-2">
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <span class="text-sm text-gray-400">Connecting...</span>
              </div>
              <button id="fullscreenBtn" class="text-gray-400 hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Game Container -->
        <div class="flex-1 flex items-center justify-center p-4">
          <div id="canvasContainer" class="relative bg-black rounded-lg shadow-2xl overflow-hidden" style="max-width: 1200px; width: 100%; aspect-ratio: 16/9;">
            <canvas id="pongCanvas" class="w-full h-full"></canvas>

            <!-- Overlay pour countdown/game over -->
            <div id="gameOverlay" class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm hidden">
              <div class="text-center">
                <div id="overlayText" class="text-6xl font-bold text-white mb-4"></div>
                <div id="overlaySubtext" class="text-xl text-gray-300"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Controls Info -->
        <div class="bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 p-4">
          <div class="max-w-7xl mx-auto">
            <div class="flex justify-center gap-8 text-sm text-gray-400">
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-gray-700 rounded text-white">↑</kbd>
                <kbd class="px-2 py-1 bg-gray-700 rounded text-white">↓</kbd>
                <span>Move Paddle</span>
              </div>
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-gray-700 rounded text-white">Space</kbd>
                <span>Ready / Start</span>
              </div>
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-gray-700 rounded text-white">ESC</kbd>
                <span>Leave Game</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }


  private attachEventListeners(): void {

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.handleLeaveGame();
      });
    }


    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }
  }


  private initCanvas(): void {
    this.canvas = document.getElementById('pongCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      console.error('Canvas not found');
      return;
    }


    const container = document.getElementById('canvasContainer');
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }


    this.renderer = new PongRenderer(this.canvas, {
      backgroundColor: '#000000',
      ballColor: '#ffffff',
      paddleColor: '#ffffff',
      showFPS: true,
    });


    this.renderer.start();


    window.addEventListener('resize', this.handleResize.bind(this));
  }


  private handleResize(): void {
    if (!this.canvas) return;

    const container = document.getElementById('canvasContainer');
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }


  private async connectToGame(): Promise<void> {
    try {
      this.updateConnectionStatus('connecting', 'Connecting...');


      if (this.params.gameId) {

        this.gameWs = pongService.connectToGame(this.params.gameId);
        this.setupGameWebSocketListeners();
      } else {

        this.matchmakingWs = pongService.connectToMatchmaking();
        this.setupMatchmakingWebSocketListeners();
        this.showOverlay('Searching...', 'Looking for an opponent');
      }

      this.updateConnectionStatus('connected', 'Connected');
    } catch (error) {
      console.error('Failed to connect to game:', error);
      this.updateConnectionStatus('error', 'Connection failed');
      showError('Failed to connect to game server');


      setTimeout(() => {
        router.navigate('/pong');
      }, 3000);
    }
  }


  private setupGameWebSocketListeners(): void {
    if (!this.gameWs) return;


    this.gameWs.onMessage((message: PongWSMessage) => {
      if (message.type === 'GAME_STATE') {
        this.handleGameStateUpdate(message.state);
      } else if (message.type === 'GAME_OVER') {
        this.handleGameOver(message);
      } else if (message.type === 'PLAYER_JOINED') {
        if (!this.myPlayerId) {
          this.myPlayerId = message.playerId;
          this.controlsEnabled = true;
          showSuccess('Joined game!');
        }
      } else if (message.type === 'POWER_UP_ACTIVATED') {
        console.log('[POWER_UP] Activated:', message.powerUpType, 'for player', message.playerId);

        if (message.powerUpType === PowerUpType.SHIELD) {
          const until = Date.now() + message.duration;
          this.shieldUntil.set(message.playerId, until);
        }
      } else if (message.type === 'POWER_UP_EXPIRED') {
        if (message.effectType === PowerUpType.SHIELD) {
          this.shieldUntil.delete(message.playerId);
        }
      } else if (message.type === 'ERROR') {
        console.error('Game error:', message.message);
        showError(message.message || 'Game error occurred');
      }
    });


    this.gameWs.onStateChange((state) => {
      if (state === 'CONNECTED') {
        this.updateConnectionStatus('connected', 'Connected');
      } else if (state === 'DISCONNECTED') {
        this.updateConnectionStatus('disconnected', 'Disconnected');
        this.controlsEnabled = false;
        this.showOverlay('Disconnected', 'Connection lost');
      }
    });
  }


  private setupMatchmakingWebSocketListeners(): void {
    if (!this.matchmakingWs) return;


    this.matchmakingWs.onMessage((message: MatchmakingWSMessage) => {
      if (message.type === 'MATCH_FOUND') {
        this.hideOverlay();
        showSuccess(`Match found! vs ${message.opponentName}`);


        pongService.disconnectFromMatchmaking();
        this.matchmakingWs = null;


        this.gameWs = pongService.connectToGame(message.gameId);
        this.setupGameWebSocketListeners();
      } else if (message.type === 'ERROR') {
        console.error('Matchmaking error:', message.message);
        showError(message.message || 'Matchmaking error occurred');
      }
    });
  }


  private handleGameStateUpdate(gameState: PongGameState): void {

    const now = Date.now();
    for (const [pid, until] of Array.from(this.shieldUntil.entries())) {
      if (until <= now) this.shieldUntil.delete(pid);
    }


    const serverEffects = gameState.activeEffects ?? [];
    const mergedEffects = [...serverEffects];
    const hasShieldFor = (pid: number) => mergedEffects.some(e => e.type === PowerUpType.SHIELD && e.playerId === pid);
    for (const [pid, until] of this.shieldUntil.entries()) {
      if (!hasShieldFor(pid)) {
        mergedEffects.push({ type: PowerUpType.SHIELD, playerId: pid, endTime: until });
      }
    }

    const stateForRender: PongGameState = { ...gameState, activeEffects: mergedEffects };


    if (this.renderer) {
      this.renderer.render(stateForRender, this.playerIds);
    }


    if (gameState.status === 'countdown' && gameState.countdown !== undefined) {
      if (gameState.countdown > 0) {
        this.showOverlay(String(gameState.countdown), 'Get Ready!');
      } else {
        this.hideOverlay();
      }
    }
  }


  private handleGameOver(message: { winnerId: number; winnerName?: string; state: PongGameState }): void {
    this.controlsEnabled = false;
    const isWinner = this.myPlayerId === message.winnerId;


    const paddleIds = Object.keys(message.state.scores).map(Number).sort((a,b)=>a-b);
    const leftId = paddleIds[0];
    const rightId = paddleIds[1];
    const s1 = message.state.scores[leftId] ?? 0;
    const s2 = message.state.scores[rightId] ?? 0;

    this.showOverlay(
      isWinner ? 'Victory!' : 'Defeat',
      `Final Score: ${s1} - ${s2}`
    );

    console.log('[PongGamePage] Game over, tournamentId:', this.params.tournamentId);

    setTimeout(() => {
      if (this.params.tournamentId) {
        console.log('[PongGamePage] Redirecting to tournament:', this.params.tournamentId);
        router.navigate(`/tournaments/${this.params.tournamentId}`);
      } else {
        console.log('[PongGamePage] Redirecting to pong menu');
        router.navigate('/pong');
      }
    }, 5000);
  }

  private setupKeyboardControls(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }


  private removeKeyboardControls(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }


  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.controlsEnabled || !this.myPlayerId) return;

    const key = e.key;


    if (key === 'ArrowUp') {
      e.preventDefault();
      pongService.movePaddleUp(this.myPlayerId);
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      pongService.movePaddleDown(this.myPlayerId);
    } else if (key === ' ') {
      e.preventDefault();
      pongService.startGame();
    } else if (key === 'Escape') {
      e.preventDefault();
      this.handleLeaveGame();
    }
  };


  private handleKeyUp = (_e: KeyboardEvent): void => {

  };


  private showOverlay(text: string, subtext: string = ''): void {
    this.overlayElement = document.getElementById('gameOverlay');
    const textEl = document.getElementById('overlayText');
    const subtextEl = document.getElementById('overlaySubtext');

    if (this.overlayElement) {
      this.overlayElement.classList.remove('hidden');
    }
    if (textEl) {
      textEl.textContent = text;
    }
    if (subtextEl) {
      subtextEl.textContent = subtext;
    }
  }


  private hideOverlay(): void {
    if (this.overlayElement) {
      this.overlayElement.classList.add('hidden');
    }
  }


  private updateConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error', text: string): void {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;

    const colors = {
      connecting: 'bg-yellow-500',
      connected: 'bg-green-500',
      disconnected: 'bg-gray-500',
      error: 'bg-red-500',
    };

    statusEl.innerHTML = `
      <div class="w-2 h-2 ${colors[status]} rounded-full ${status === 'connecting' ? 'animate-pulse' : ''}"></div>
      <span class="text-sm text-gray-400">${text}</span>
    `;
  }


  private toggleFullscreen(): void {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }


  private handleLeaveGame(): void {
    const confirmed = confirm('Are you sure you want to leave the game?');
    if (confirmed) {
      pongService.endGame();
      if (this.params.tournamentId) {
        router.navigate(`/tournaments/${this.params.tournamentId}`);
      } else {
        router.navigate('/pong');
      }
    }
  }
}
