import { Navbar } from '@/components/Navbar';
import { Loader } from '@/components/Loader';
import { router } from '@/router';
import { tournamentService } from '@/services/TournamentService';
import { userService } from '@/services/UserService';
import { showError, showSuccess } from '@/components/Notification';
import { getUser } from '@/utils/storage';
import type { Tournament, TournamentParticipant, TournamentWSMessage } from '@/types';
import type { WebSocketManager } from '@/services/WebSocketManager';

export function TournamentLobbyPage(): HTMLElement {
  const tournamentId = parseInt(window.location.pathname.split('/').pop()?.replace('lobby', '') || '0');

  let tournament: Tournament | null = null;
  let participants: TournamentParticipant[] = [];
  let ws: WebSocketManager<TournamentWSMessage> | null = null;
  let wsInitialized = false;
  const currentUser = getUser();

  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gray-900';

  const navbar = Navbar();
  container.appendChild(navbar);

  const main = document.createElement('main');
  main.className = 'pt-20 px-4 pb-12';

  const maxWidth = document.createElement('div');
  maxWidth.className = 'max-w-6xl mx-auto';

  const loaderContainer = document.createElement('div');
  loaderContainer.id = 'mainLoader';
  loaderContainer.className = 'flex justify-center items-center min-h-[400px]';
  const loader = Loader({ size: 'xl', color: 'primary' });
  loaderContainer.appendChild(loader);
  maxWidth.appendChild(loaderContainer);

  const contentContainer = document.createElement('div');
  contentContainer.id = 'content';
  contentContainer.className = 'hidden';
  maxWidth.appendChild(contentContainer);

  main.appendChild(maxWidth);
  container.appendChild(main);

  async function loadLobbyData() {
    try {
      const status = await tournamentService.getTournamentStatus(tournamentId);
      tournament = status.tournament;
      participants = await tournamentService.getTournamentParticipants(tournamentId);

      if (tournament && tournament.status !== 'waiting') {
        router.navigate(`/tournaments/${tournamentId}`);
        return;
      }

      loaderContainer.classList.add('hidden');
      contentContainer.classList.remove('hidden');

      renderContent();

      if (!wsInitialized) {
        initWebSocket();
        wsInitialized = true;
      }
    } catch (error) {
      console.error('Failed to load lobby:', error);
      showError('Failed to load tournament lobby');
      router.navigate('/tournaments');
    }
  }

  async function refreshLobbyData() {
    try {
      const status = await tournamentService.getTournamentStatus(tournamentId);
      tournament = status.tournament;
      participants = await tournamentService.getTournamentParticipants(tournamentId);

      if (tournament && tournament.status !== 'waiting') {
        return;
      }

      renderContent();
    } catch (error) {
      console.error('Failed to refresh lobby data:', error);
    }
  }

  function renderContent() {
    if (!tournament) return;

    contentContainer.innerHTML = '';

    const backBtn = document.createElement('button');
    backBtn.className = 'text-gray-400 hover:text-white mb-4 flex items-center gap-2';
    backBtn.innerHTML = '<span>←</span><span>Back to Tournaments</span>';
    backBtn.addEventListener('click', () => router.navigate('/tournaments'));
    contentContainer.appendChild(backBtn);

    const header = createHeader();
    contentContainer.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8';

    const leftColumn = document.createElement('div');
    leftColumn.className = 'lg:col-span-2';

    const participantsCard = createParticipantsCard();
    leftColumn.appendChild(participantsCard);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'space-y-6';

    const infoCard = createInfoCard();
    rightColumn.appendChild(infoCard);

    const rulesCard = createRulesCard();
    rightColumn.appendChild(rulesCard);

    grid.appendChild(leftColumn);
    grid.appendChild(rightColumn);
    contentContainer.appendChild(grid);
  }

  function createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg p-8 text-center';

    header.innerHTML = `
      <div class="text-6xl mb-4">🏆</div>
      <h1 class="text-4xl font-bold text-white mb-2">${escapeHtml(tournament?.name || '')}</h1>
      <p class="text-white/80 text-lg mb-4">Waiting for players to join...</p>
      <div class="flex items-center justify-center gap-4">
        <div class="bg-white/20 backdrop-blur rounded-lg px-6 py-3">
          <div class="text-3xl font-bold text-white">${participants.length}</div>
          <div class="text-white/80 text-sm">Players</div>
        </div>
        <div class="text-white text-2xl">/</div>
        <div class="bg-white/20 backdrop-blur rounded-lg px-6 py-3">
          <div class="text-3xl font-bold text-white">${tournament?.maxParticipants}</div>
          <div class="text-white/80 text-sm">Required</div>
        </div>
      </div>
    `;

    return header;
  }

  function createParticipantsCard(): HTMLElement {
    const card = document.createElement('div');
    card.id = 'participantsCard';
    card.className = 'bg-gray-800 rounded-lg p-6';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-6';

    const title = document.createElement('h2');
    title.className = 'text-2xl font-bold text-white';
    title.textContent = 'Players in Lobby';
    header.appendChild(title);

    const count = document.createElement('span');
    count.className = 'text-gray-400';
    count.textContent = `${participants.length}/${tournament?.maxParticipants} joined`;
    header.appendChild(count);

    card.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

    const slots = tournament?.maxParticipants || 8;

    for (let i = 0; i < slots; i++) {
      const participant = participants[i];
      const slot = createParticipantSlot(participant, i + 1);
      grid.appendChild(slot);
    }

    card.appendChild(grid);

    const isParticipant = participants.some(p => p.userId === currentUser?.id);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'mt-6 flex gap-3';

    if (!isParticipant && participants.length < slots) {
      const joinBtn = document.createElement('button');
      joinBtn.className = 'flex-1 px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white text-lg font-bold rounded-lg transition';
      joinBtn.textContent = 'Join Tournament';
      joinBtn.addEventListener('click', () => handleJoinTournament());
      actionsDiv.appendChild(joinBtn);
    } else if (isParticipant) {
      const leaveBtn = document.createElement('button');
      leaveBtn.className = 'flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white text-lg font-bold rounded-lg transition';
      leaveBtn.textContent = 'Leave Tournament';
      leaveBtn.addEventListener('click', () => handleLeaveTournament());
      actionsDiv.appendChild(leaveBtn);
    }

    if (tournament?.creatorId === currentUser?.id && participants.length >= 4) {
      const startBtn = document.createElement('button');
      startBtn.className = 'flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-lg transition';
      startBtn.innerHTML = '<span>🚀</span> <span>Start Tournament</span>';
      startBtn.addEventListener('click', () => handleStartTournament());
      actionsDiv.appendChild(startBtn);
    }

    card.appendChild(actionsDiv);

    return card;
  }

  function createParticipantSlot(participant: TournamentParticipant | undefined, _slotNumber: number): HTMLElement {
    const slot = document.createElement('div');

    if (participant) {
      slot.className = 'flex items-center gap-4 p-4 bg-gray-750 rounded-lg border-2 border-green-600';

      const avatar = document.createElement('div');
      avatar.className = 'w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden';

      const userId = participant.userId;
      const displayName = participant.displayName;

      if (userId && userId > 0) {
        userService.getUserById(userId).then(user => {
          const avatarUrl = user.profilePicture;
          if (avatarUrl) {
            avatar.className = 'w-14 h-14 rounded-full flex-shrink-0 overflow-hidden';
            avatar.innerHTML = `<img src="${avatarUrl}" alt="${displayName}" class="w-full h-full object-cover" />`;
          } else {
            avatar.innerHTML = `<span class="text-white text-xl font-bold">${escapeHtml(displayName.substring(0, 2).toUpperCase())}</span>`;
          }
        }).catch(() => {
          avatar.innerHTML = `<span class="text-white text-xl font-bold">${escapeHtml(displayName.substring(0, 2).toUpperCase())}</span>`;
        });
      } else {
        avatar.innerHTML = `<span class="text-white text-xl font-bold">${escapeHtml(displayName.substring(0, 2).toUpperCase())}</span>`;
      }

      const info = document.createElement('div');
      info.className = 'flex-1';
      info.innerHTML = `
        <div class="text-white font-bold text-lg">${escapeHtml(displayName)}</div>
        <div class="text-green-400 text-sm flex items-center gap-1">
          <span>✓</span>
          <span>Ready</span>
        </div>
      `;

      const seed = document.createElement('div');
      seed.className = 'text-gray-400 text-sm';
      seed.textContent = `#${participant.seed}`;

      slot.appendChild(avatar);
      slot.appendChild(info);
      slot.appendChild(seed);
    } else {
      slot.className = 'flex items-center gap-4 p-4 bg-gray-750/50 rounded-lg border-2 border-dashed border-gray-600';

      const avatar = document.createElement('div');
      avatar.className = 'w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0';
      avatar.innerHTML = '<span class="text-gray-500 text-2xl">?</span>';

      const info = document.createElement('div');
      info.innerHTML = `
        <div class="text-gray-500 font-medium">Empty Slot</div>
        <div class="text-gray-600 text-sm">Waiting for player...</div>
      `;

      slot.appendChild(avatar);
      slot.appendChild(info);
    }

    return slot;
  }

  function createInfoCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg p-6';

    card.innerHTML = `
      <h3 class="text-xl font-bold text-white mb-4">Tournament Details</h3>
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-400">Creator</span>
          <span class="text-white font-medium">${escapeHtml(tournament?.creatorDisplayName || '')}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Format</span>
          <span class="text-white font-medium">Single Elimination</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Total Rounds</span>
          <span class="text-white font-medium">${tournament?.totalRounds}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Min Players</span>
          <span class="text-white font-medium">4</span>
        </div>
      </div>

      ${tournament?.creatorId === currentUser?.id ? `
      <div class="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
        <div class="flex gap-2 mb-2">
          <span class="text-xl">👑</span>
          <span class="text-yellow-400 font-bold">You are the creator</span>
        </div>
        <p class="text-sm text-yellow-200">You can start the tournament when at least 4 players have joined.</p>
      </div>
      ` : ''}
    `;

    return card;
  }

  function createRulesCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg p-6';

    card.innerHTML = `
      <h3 class="text-xl font-bold text-white mb-4">📜 Rules</h3>
      <ul class="space-y-2 text-gray-300 text-sm">
        <li class="flex gap-2">
          <span class="text-primary-400">•</span>
          <span>Single elimination bracket format</span>
        </li>
        <li class="flex gap-2">
          <span class="text-primary-400">•</span>
          <span>Best of 1 matches</span>
        </li>
        <li class="flex gap-2">
          <span class="text-primary-400">•</span>
          <span>Winners advance to next round</span>
        </li>
        <li class="flex gap-2">
          <span class="text-primary-400">•</span>
          <span>Losers are eliminated</span>
        </li>
        <li class="flex gap-2">
          <span class="text-primary-400">•</span>
          <span>Standard Pong rules apply</span>
        </li>
        <li class="flex gap-2">
          <span class="text-primary-400">•</span>
          <span>First to 5 points wins</span>
        </li>
      </ul>

      <div class="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
        <p class="text-sm text-blue-200">💡 Tip: Stay in the lobby until the tournament starts!</p>
      </div>
    `;

    return card;
  }

  function initWebSocket() {
    try {
      ws = tournamentService.connectToTournament(tournamentId);

      ws.onMessage((message: TournamentWSMessage) => {
        handleWebSocketMessage(message);
      });

      ws.onError((error) => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      console.error('Failed to connect to lobby WebSocket:', error);
    }
  }

  function handleWebSocketMessage(message: TournamentWSMessage) {
    switch (message.type) {
      case 'PARTICIPANT_JOINED':
        showSuccess(`${message.displayName} joined the tournament!`);
        refreshLobbyData();
        break;

      case 'PARTICIPANT_LEFT':
        showSuccess(`${message.displayName} left the tournament`);
        refreshLobbyData();
        break;

      case 'TOURNAMENT_STARTED':
        showSuccess('Tournament is starting! Redirecting to bracket...');
        setTimeout(() => {
          router.navigate(`/tournaments/${tournamentId}`);
        }, 1500);
        break;

      case 'ERROR':
        showError(message.message);
        break;

      default:
        break;
    }
  }

  async function handleJoinTournament() {
    if (!currentUser) {
      showError('You must be logged in to join');
      return;
    }

    try {
      await tournamentService.joinTournament(tournamentId, currentUser.displayName);
      showSuccess('Joined tournament successfully!');
      await loadLobbyData();
    } catch (error) {
      console.error('Failed to join tournament:', error);
      showError('Failed to join tournament');
    }
  }

  async function handleLeaveTournament() {
    if (!currentUser) return;

    try {
      await tournamentService.leaveTournament(tournamentId, { userId: currentUser.id });
      showSuccess('Left tournament successfully');
      router.navigate('/tournaments');
    } catch (error) {
      console.error('Failed to leave tournament:', error);
      showError('Failed to leave tournament');
    }
  }

  async function handleStartTournament() {
    try {
      await tournamentService.startTournament(tournamentId);
    } catch (error) {
      console.error('Failed to start tournament:', error);
      showError('Failed to start tournament');
    }
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  window.addEventListener('beforeunload', () => {
    if (ws) {
      tournamentService.disconnectFromTournament(tournamentId);
    }
  });

  loadLobbyData();

  return container;
}
