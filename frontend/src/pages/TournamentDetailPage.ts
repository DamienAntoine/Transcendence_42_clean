import { Navbar } from '@/components/Navbar';
import { Loader } from '@/components/Loader';
import { router } from '@/router';
import { tournamentService } from '@/services/TournamentService';
import { userService } from '@/services/UserService';
import { showError, showSuccess } from '@/components/Notification';
import { getUser } from '@/utils/storage';
import type { Tournament, TournamentParticipant, TournamentMatch, TournamentWSMessage } from '@/types';
import type { WebSocketManager } from '@/services/WebSocketManager';

export function TournamentDetailPage(): HTMLElement {
  const tournamentId = parseInt(window.location.pathname.split('/').pop() || '0');

  let tournament: Tournament | null = null;
  let participants: TournamentParticipant[] = [];
  let matches: TournamentMatch[] = [];
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
  maxWidth.className = 'max-w-7xl mx-auto';

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

  async function loadTournamentData() {
    try {
      const status = await tournamentService.getTournamentStatus(tournamentId);
      tournament = status.tournament;
      if (tournament && (tournament as any).creatorId) {
        try {
          const creator = await userService.getUserById((tournament as any).creatorId);
          (tournament as any).creatorDisplayName = creator.displayName;
        } catch {
        }
      }
      participants = await tournamentService.getTournamentParticipants(tournamentId);
      matches = await tournamentService.getTournamentMatches(tournamentId);

      loaderContainer.classList.add('hidden');
      contentContainer.classList.remove('hidden');

      renderContent();

      if (!wsInitialized) {
        initWebSocket();
        wsInitialized = true;
      }
    } catch (error) {
      console.error('Failed to load tournament:', error);
      showError('Failed to load tournament details');
      loaderContainer.innerHTML = '<div class="text-center"><p class="text-gray-400 mb-4">Tournament not found</p><button id="backBtn" class="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Back to Tournaments</button></div>';
      const backBtn = loaderContainer.querySelector('#backBtn');
      backBtn?.addEventListener('click', () => router.navigate('/tournaments'));
    }
  }

  async function refreshTournamentData() {
    try {
      const status = await tournamentService.getTournamentStatus(tournamentId);
      tournament = status.tournament;
      if (tournament && (tournament as any).creatorId) {
        try {
          const creator = await userService.getUserById((tournament as any).creatorId);
          (tournament as any).creatorDisplayName = creator.displayName;
        } catch {
        }
      }
      participants = await tournamentService.getTournamentParticipants(tournamentId);
      matches = await tournamentService.getTournamentMatches(tournamentId);
      renderContent();
    } catch (error) {
      console.error('Failed to refresh tournament data:', error);
    }
  }

  function renderContent() {
    if (!tournament) return;

    contentContainer.innerHTML = '';

    const header = createHeader();
    contentContainer.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8';

    const leftColumn = document.createElement('div');
    leftColumn.className = 'lg:col-span-2 space-y-6';

    const bracketSection = createBracketSection();
    leftColumn.appendChild(bracketSection);

    const matchesSection = createMatchesSection();
    leftColumn.appendChild(matchesSection);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'space-y-6';

    const infoCard = createInfoCard();
    rightColumn.appendChild(infoCard);

    const participantsCard = createParticipantsCard();
    rightColumn.appendChild(participantsCard);

    grid.appendChild(leftColumn);
    grid.appendChild(rightColumn);
    contentContainer.appendChild(grid);
  }

  function createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'flex flex-col md:flex-row md:items-center md:justify-between gap-4';

    const titleSection = document.createElement('div');

    const backLink = document.createElement('button');
    backLink.className = 'text-gray-400 hover:text-white mb-2 flex items-center gap-2';
    backLink.innerHTML = '<span>←</span><span>Back to Tournaments</span>';
    backLink.addEventListener('click', () => router.navigate('/tournaments'));
    titleSection.appendChild(backLink);

    const title = document.createElement('h1');
    title.className = 'text-4xl font-bold text-white mb-2';
    title.textContent = tournament?.name || 'Tournament';
    titleSection.appendChild(title);

    const statusBadge = document.createElement('span');

    const rawStatus = (tournament as any)?.status as string | undefined;
    const normStatus = rawStatus === 'pending' ? 'waiting'
      : rawStatus === 'started' ? 'in_progress'
      : rawStatus === 'cancelled' ? 'cancelled'
      : (rawStatus || 'waiting');
    const statusColors: Record<string, string> = {
      waiting: 'bg-blue-600',
      in_progress: 'bg-green-600',
      finished: 'bg-gray-600',
      cancelled: 'bg-red-600',
    };
    const statusLabels: Record<string, string> = {
      waiting: 'Waiting for Players',
      in_progress: 'In Progress',
      finished: 'Finished',
      cancelled: 'Cancelled',
    };
    statusBadge.className = `inline-block px-3 py-1 ${statusColors[normStatus]} text-white text-sm font-medium rounded-full`;
    statusBadge.textContent = statusLabels[normStatus];
    titleSection.appendChild(statusBadge);

    header.appendChild(titleSection);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex gap-3';

  const isWaiting = normStatus === 'waiting';
  const isInProgress = normStatus === 'in_progress';
  if (isWaiting) {
      const isParticipant = participants.some(p => p.userId === currentUser?.id);
      if (!isParticipant && participants.length < ((tournament as any)?.maxParticipants || Infinity)) {
        const joinBtn = document.createElement('button');
        joinBtn.className = 'px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition';
        joinBtn.textContent = 'Join Tournament';
        joinBtn.addEventListener('click', () => handleJoinTournament());
        actionsDiv.appendChild(joinBtn);
      } else if (isParticipant) {
        const leaveBtn = document.createElement('button');
        leaveBtn.className = 'px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition';
        leaveBtn.textContent = 'Leave Tournament';
        leaveBtn.addEventListener('click', () => handleLeaveTournament());
        actionsDiv.appendChild(leaveBtn);
      }
      const creatorId = (tournament as any)?.creator_id ?? (tournament as any)?.creatorId;
      if (creatorId === currentUser?.id && participants.length >= 2) {
        const startBtn = document.createElement('button');
        startBtn.className = 'px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition';
        startBtn.textContent = 'Start Tournament';
        startBtn.addEventListener('click', () => handleStartTournament());
        actionsDiv.appendChild(startBtn);
      }


      if (creatorId === currentUser?.id) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition';
        cancelBtn.textContent = 'Cancel Tournament';
        cancelBtn.addEventListener('click', async () => {
          if (!confirm('Are you sure you want to cancel this tournament?')) return;
          try {
            await tournamentService.finishTournament(tournamentId);
            showSuccess('Tournament cancelled');
            await loadTournamentData();
          } catch (error) {
            console.error('Failed to cancel tournament:', error);
            showError('Failed to cancel tournament');
          }
        });
        actionsDiv.appendChild(cancelBtn);
      }
    }


    if (isInProgress) {
      const creatorId = (tournament as any)?.creator_id ?? (tournament as any)?.creatorId;
      if (creatorId === currentUser?.id) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition';
        cancelBtn.textContent = 'Cancel Tournament';
        cancelBtn.addEventListener('click', async () => {
          if (!confirm('Are you sure you want to cancel this tournament?')) return;
          try {
            await tournamentService.finishTournament(tournamentId);
            showSuccess('Tournament cancelled');
            await loadTournamentData();
          } catch (error) {
            console.error('Failed to cancel tournament:', error);
            showError('Failed to cancel tournament');
          }
        });
        actionsDiv.appendChild(cancelBtn);
      }
    }

    header.appendChild(actionsDiv);

    return header;
  }

  function createInfoCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg p-6';

    const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
    const currentRound = matches.length > 0
      ? Math.max(...matches.filter(m => m.status === 'finished' || m.status === 'in_progress').map(m => m.round), 0)
      : 0;

    card.innerHTML = `
      <h3 class="text-xl font-bold text-white mb-4">Tournament Info</h3>
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-400">Status</span>
          <span class="text-white font-medium">${(tournament?.status || 'waiting').replace('_', ' ')}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Players</span>
          <span class="text-white font-medium">${participants.length}${(tournament as any)?.maxParticipants ? `/${(tournament as any).maxParticipants}` : ''}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Current Round</span>
          <span class="text-white font-medium">${currentRound}/${totalRounds}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Creator</span>
          <span class="text-white font-medium">${escapeHtml((tournament as any)?.creatorDisplayName || 'Unknown')}</span>
        </div>
        ${tournament?.winnerId ? `
        <div class="mt-4 pt-4 border-t border-gray-700">
          <div class="text-center">
            <div class="text-4xl mb-2">🏆</div>
            <div class="text-lg font-bold text-yellow-400">Winner</div>
            <div class="text-white font-medium">${escapeHtml(tournament?.winnerDisplayName || '')}</div>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    return card;
  }

  function createParticipantsCard(): HTMLElement {
    const card = document.createElement('div');
    card.id = 'participantsCard';
    card.className = 'bg-gray-800 rounded-lg p-6';

    const header = document.createElement('h3');
    header.className = 'text-xl font-bold text-white mb-4';
    header.textContent = `Participants (${participants.length})`;
    card.appendChild(header);

    const list = document.createElement('div');
    list.className = 'space-y-2';

    if (participants.length === 0) {
      list.innerHTML = '<p class="text-gray-400 text-center py-4">No participants yet</p>';
    } else {
      participants.forEach((participant) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-750 rounded-lg';
        const name = (participant as any)?.displayName ?? (participant as any)?.displayname ?? 'Unknown';
        const userId = participant.userId;

        const avatar = document.createElement('div');
        avatar.className = 'w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center overflow-hidden';

        if (userId && userId > 0) {
          userService.getUserById(userId).then(user => {
            const avatarUrl = user.profilePicture;
            if (avatarUrl) {
              avatar.innerHTML = `<img src="${avatarUrl}" alt="${name}" class="w-full h-full object-cover" />`;
            } else {
              const initials = name.substring(0, 2).toUpperCase();
              avatar.innerHTML = `<span class="text-white font-bold">${initials}</span>`;
            }
          }).catch(() => {
            const initials = name.substring(0, 2).toUpperCase();
            avatar.innerHTML = `<span class="text-white font-bold">${initials}</span>`;
          });
        } else {
          const initials = name.substring(0, 2).toUpperCase();
          avatar.innerHTML = `<span class="text-white font-bold">${initials}</span>`;
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'text-white font-medium';
        nameSpan.textContent = name;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex items-center gap-3';
        infoDiv.appendChild(avatar);
        infoDiv.appendChild(nameSpan);

        item.appendChild(infoDiv);

        if (participant.eliminated) {
          const eliminatedSpan = document.createElement('span');
          eliminatedSpan.className = 'text-red-400 text-sm';
          eliminatedSpan.textContent = 'Eliminated';
          item.appendChild(eliminatedSpan);
        }

        list.appendChild(item);
      });
    }

    card.appendChild(list);

    return card;
  }

  function createBracketSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'bg-gray-800 rounded-lg p-6';

    const header = document.createElement('h3');
    header.className = 'text-xl font-bold text-white mb-4';
    header.textContent = 'Tournament Bracket';
    section.appendChild(header);

    const bracketContainer = document.createElement('div');
    bracketContainer.id = 'bracket';
    bracketContainer.className = 'overflow-x-auto';

    if (matches.length === 0) {
      bracketContainer.innerHTML = '<p class="text-gray-400 text-center py-8">Bracket will appear when tournament starts</p>';
    } else {
      const bracket = createBracketView();
      bracketContainer.appendChild(bracket);
    }

    section.appendChild(bracketContainer);

    return section;
  }

  function createBracketView(): HTMLElement {
    const bracket = document.createElement('div');
    bracket.className = 'flex gap-8 min-w-max p-4';

    const rounds = Math.max(...matches.map(m => m.round));

    for (let round = 1; round <= rounds; round++) {
      const roundMatches = matches.filter(m => m.round === round);
      const roundColumn = document.createElement('div');
      roundColumn.className = 'flex flex-col justify-around gap-4';

      const roundTitle = document.createElement('div');
      roundTitle.className = 'text-center text-gray-400 font-medium mb-4';
      roundTitle.textContent = round === rounds ? 'Final' : `Round ${round}`;
      roundColumn.appendChild(roundTitle);

      roundMatches.forEach((match) => {
        const matchCard = createMatchCard(match);
        roundColumn.appendChild(matchCard);
      });

      bracket.appendChild(roundColumn);
    }

    return bracket;
  }

  function createMatchCard(match: TournamentMatch): HTMLElement {
    const card = document.createElement('div');
    card.className = 'bg-gray-750 rounded-lg p-4 w-64 border-2 border-gray-600';

    if (match.status === 'finished') {
      card.classList.add('border-green-600');
    } else if (match.status === 'in_progress') {
      card.classList.add('border-yellow-600');
    }

    const player1 = document.createElement('div');
    player1.className = `flex items-center justify-between p-2 rounded ${match.winnerId === match.player1Id ? 'bg-green-900/30' : 'bg-gray-700'}`;
    const showP1Score = typeof match.player1Score === 'number';
    player1.innerHTML = `
      <span class="text-white font-medium">${escapeHtml(match.player1DisplayName || 'TBD')}</span>
      ${showP1Score ? `<span class="text-white font-bold">${match.player1Score}</span>` : ''}
    `;

    const vs = document.createElement('div');
    vs.className = 'text-center text-gray-500 text-sm my-1';
    vs.textContent = 'VS';

    const player2 = document.createElement('div');
    player2.className = `flex items-center justify-between p-2 rounded ${match.winnerId === match.player2Id ? 'bg-green-900/30' : 'bg-gray-700'}`;
    const showP2Score = typeof match.player2Score === 'number';
    player2.innerHTML = `
      <span class="text-white font-medium">${escapeHtml(match.player2DisplayName || 'TBD')}</span>
      ${showP2Score ? `<span class="text-white font-bold">${match.player2Score}</span>` : ''}
    `;

    card.appendChild(player1);
    card.appendChild(vs);
    card.appendChild(player2);

    const userId = currentUser?.id;
    const isParticipant = userId && (match.player1Id === userId || match.player2Id === userId);

    if (match.gameId && isParticipant && match.status !== 'finished') {
      const joinBtn = document.createElement('button');
      joinBtn.className = 'w-full mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition';
      joinBtn.textContent = match.status === 'in_progress' ? 'Rejoin Match' : 'Join Match';
      joinBtn.addEventListener('click', () => {
        if (match.status === 'finished') {
          joinBtn.disabled = true;
          joinBtn.className = 'w-full mt-3 px-4 py-2 bg-gray-700 text-gray-400 text-sm rounded cursor-not-allowed';
          joinBtn.textContent = 'Match Finished';
          return;
        }
        router.navigate(`/pong/game/${match.gameId}?tournamentId=${tournamentId}`);
      });
      card.appendChild(joinBtn);
    } else if (isParticipant && match.status === 'finished') {
      const disabledBtn = document.createElement('button');
      disabledBtn.className = 'w-full mt-3 px-4 py-2 bg-gray-700 text-gray-400 text-sm rounded cursor-not-allowed';
      disabledBtn.textContent = 'Match Finished';
      disabledBtn.disabled = true;
      card.appendChild(disabledBtn);
    } else if (match.status === 'in_progress' && match.gameId) {
      const watchBtn = document.createElement('button');
      watchBtn.className = 'w-full mt-3 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded transition';
      watchBtn.textContent = 'Watch Game';
      watchBtn.addEventListener('click', () => router.navigate(`/pong/game/${match.gameId}?tournamentId=${tournamentId}`));
      card.appendChild(watchBtn);
    }

    return card;
  }

  function createMatchesSection(): HTMLElement {
    const section = document.createElement('div');
    section.id = 'matchesSection';
    section.className = 'bg-gray-800 rounded-lg p-6';

    const header = document.createElement('h3');
    header.className = 'text-xl font-bold text-white mb-4';
    header.textContent = 'Match History';
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'space-y-3';

    const finishedMatches = matches.filter(m => m.status === 'finished').reverse();

    if (finishedMatches.length === 0) {
      list.innerHTML = '<p class="text-gray-400 text-center py-4">No matches completed yet</p>';
    } else {
      finishedMatches.forEach((match) => {
        const item = document.createElement('div');
        item.className = 'p-4 bg-gray-750 rounded-lg';
        item.innerHTML = `
          <div class="flex justify-between items-center mb-2">
            <span class="text-gray-400 text-sm">Round ${match.round}</span>
            <span class="text-green-400 text-sm">Finished</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-white font-medium ${match.winnerId === match.player1Id ? 'text-green-400' : ''}">${escapeHtml(match.player1DisplayName || 'TBD')}</span>
            <span class="text-white font-bold">${match.player1Score} - ${match.player2Score}</span>
            <span class="text-white font-medium ${match.winnerId === match.player2Id ? 'text-green-400' : ''}">${escapeHtml(match.player2DisplayName || 'TBD')}</span>
          </div>
        `;
        list.appendChild(item);
      });
    }

    section.appendChild(list);

    return section;
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
      console.error('Failed to connect to tournament WebSocket:', error);
    }
  }

  function handleWebSocketMessage(message: TournamentWSMessage) {
    switch (message.type) {
      case 'TOURNAMENT_STARTED':
        showSuccess('Tournament has started!');
        refreshTournamentData();
        break;

      case 'PARTICIPANT_JOINED':
        showSuccess(`${message.displayName} joined the tournament`);
        refreshTournamentData();
        break;

      case 'PARTICIPANT_LEFT':
        showSuccess(`${message.displayName} left the tournament`);
        refreshTournamentData();
        break;

      case 'NEXT_MATCH_READY':
        showSuccess(`Your match is ready! Playing against ${message.opponentName || 'your opponent'}`);
        refreshTournamentData();
        break;

      case 'MATCH_STARTED':
        refreshTournamentData();
        break;

      case 'MATCH_FINISHED':
        if (message.winnerId !== currentUser?.id) {
          showSuccess(`Match finished! Winner: ${message.winnerName}`);
        }
        refreshTournamentData();
        break;

      case 'ROUND_COMPLETE':
        showSuccess(`Round ${message.round} complete! Starting round ${message.nextRound}`);
        refreshTournamentData();
        break;

      case 'TOURNAMENT_COMPLETE':
        showSuccess(`Tournament finished! Winner: ${message.winnerName}`);
        refreshTournamentData();
        break;

      case 'ERROR':
        showError(message.message);
        break;
    }
  }

  async function handleJoinTournament() {
    let nameToUse: string | undefined;
    let asGuest = false;
    if (!currentUser) {
      const input = window.prompt('Enter a display name to join as guest:');
      if (!input || input.trim().length === 0) {
        showError('Display name is required to join');
        return;
      }
      nameToUse = input.trim();
      asGuest = true;
    } else {
      nameToUse = currentUser.displayName;
    }

    try {
      await tournamentService.joinTournament(tournamentId, nameToUse!, asGuest);
      showSuccess('Joined tournament successfully!');
      await loadTournamentData();
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
      await loadTournamentData();
    } catch (error) {
      console.error('Failed to leave tournament:', error);
      showError('Failed to leave tournament');
    }
  }

  async function handleStartTournament() {
    try {
      await tournamentService.startTournament(tournamentId);
      await refreshTournamentData();
    } catch (error) {
      console.error('Failed to start tournament:', error);
      const message = (error as any)?.message || 'Failed to start tournament';
      showError(message);
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

  loadTournamentData();

  return container;
}
