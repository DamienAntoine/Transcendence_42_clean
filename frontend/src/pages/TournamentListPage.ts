import { Navbar } from '@/components/Navbar';
import { Loader } from '@/components/Loader';
import { router } from '@/router';
import { tournamentService } from '@/services/TournamentService';
import { showError } from '@/components/Notification';
import type { Tournament } from '@/types';

export function TournamentListPage(): HTMLElement {
  let tournaments: Tournament[] = [];
  let filteredTournaments: Tournament[] = [];
  let currentFilter: 'all' | 'waiting' | 'in_progress' | 'finished' = 'all';

  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gray-900';

  const navbar = Navbar();
  container.appendChild(navbar);

  const main = document.createElement('main');
  main.className = 'pt-20 px-4 pb-12';

  const maxWidth = document.createElement('div');
  maxWidth.className = 'max-w-7xl mx-auto';

  const header = document.createElement('div');
  header.className = 'flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4';

  const titleSection = document.createElement('div');
  titleSection.innerHTML = '<h1 class="text-4xl font-bold text-white mb-2">🏆 Tournaments</h1><p class="text-gray-400">Join competitive tournaments and test your skills</p>';

  const createBtn = document.createElement('button');
  createBtn.className = 'px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition';
  createBtn.textContent = '+ Create Tournament';
  createBtn.addEventListener('click', () => router.navigate('/tournaments/create'));

  header.appendChild(titleSection);
  header.appendChild(createBtn);
  maxWidth.appendChild(header);

  const filterBar = document.createElement('div');
  filterBar.className = 'flex flex-wrap gap-2 mb-6';
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'finished', label: 'Finished' },
  ];

  filters.forEach((filter) => {
    const btn = document.createElement('button');
    btn.className = 'px-4 py-2 rounded-lg font-medium transition';
    btn.textContent = filter.label;
    btn.dataset.filter = filter.key;
    updateFilterButton(btn, filter.key === currentFilter);
    btn.addEventListener('click', () => {
      currentFilter = filter.key as typeof currentFilter;
      filterBar.querySelectorAll('button').forEach((b) =>
        updateFilterButton(b as HTMLButtonElement, b.dataset.filter === currentFilter)
      );
      applyFilter();
    });
    filterBar.appendChild(btn);
  });
  maxWidth.appendChild(filterBar);

  const searchBar = document.createElement('div');
  searchBar.className = 'mb-6';
  searchBar.innerHTML = '<input type="text" id="searchInput" placeholder="Search tournaments..." class="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-primary-500 focus:outline-none" />';
  const searchInput = searchBar.querySelector('#searchInput') as HTMLInputElement;
  searchInput.addEventListener('input', () => applyFilter());
  maxWidth.appendChild(searchBar);

  const grid = document.createElement('div');
  grid.id = 'tournamentsGrid';
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  maxWidth.appendChild(grid);

  const loaderContainer = document.createElement('div');
  loaderContainer.className = 'flex justify-center mt-12';
  loaderContainer.id = 'loaderContainer';
  const loader = Loader({ size: 'lg', color: 'primary' });
  loaderContainer.appendChild(loader);
  maxWidth.appendChild(loaderContainer);

  main.appendChild(maxWidth);
  container.appendChild(main);

  function updateFilterButton(btn: HTMLButtonElement, active: boolean) {
    if (active) {
      btn.className = 'px-4 py-2 rounded-lg font-medium transition bg-primary-600 text-white';
    } else {
      btn.className = 'px-4 py-2 rounded-lg font-medium transition bg-gray-800 text-gray-300 hover:bg-gray-700';
    }
  }

  function applyFilter() {
    const searchTerm = searchInput.value.toLowerCase();
    filteredTournaments = tournaments.filter((t) => {
      const matchesFilter = currentFilter === 'all' || t.status === currentFilter;
      const matchesSearch = t.name.toLowerCase().includes(searchTerm) ||
        t.creatorDisplayName.toLowerCase().includes(searchTerm);
      return matchesFilter && matchesSearch;
    });
    renderTournaments();
  }

  function renderTournaments() {
    grid.innerHTML = '';

    if (filteredTournaments.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'col-span-full text-center py-12';
      emptyState.innerHTML = '<div class="text-gray-400 text-lg">No tournaments found</div><p class="text-gray-500 mt-2">Try adjusting your filters or create a new tournament</p>';
      grid.appendChild(emptyState);
      return;
    }

    filteredTournaments.forEach((tournament) => {
      const card = createTournamentCard(tournament);
      grid.appendChild(card);
    });
  }

  function createTournamentCard(tournament: Tournament): HTMLElement {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg overflow-hidden hover:shadow-xl hover:shadow-primary-500/10 transition cursor-pointer';
    card.addEventListener('click', () => router.navigate(`/tournaments/${tournament.id}`));

    const statusColors = {
      waiting: 'bg-blue-600',
      in_progress: 'bg-green-600',
      finished: 'bg-gray-600',
    };

    const statusLabels = {
      waiting: 'Waiting',
      in_progress: 'In Progress',
      finished: 'Finished',
    };

    const playersText = tournament.maxParticipants && tournament.maxParticipants > 0
      ? `${tournament.currentParticipants}/${tournament.maxParticipants}`
      : `${tournament.currentParticipants}`;
    const roundText = tournament.totalRounds && tournament.totalRounds > 0
      ? `${tournament.currentRound}/${tournament.totalRounds}`
      : '—';

    card.innerHTML = `
      <div class="${statusColors[tournament.status]} p-4 text-center">
        <div class="text-4xl mb-2">🏆</div>
        <h3 class="text-xl font-bold text-white">${escapeHtml(tournament.name)}</h3>
      </div>
      <div class="p-4 space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Status</span>
          <span class="text-white font-medium">${statusLabels[tournament.status]}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Players</span>
          <span class="text-white font-medium">${playersText}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Round</span>
          <span class="text-white font-medium">${roundText}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Creator</span>
          <span class="text-white font-medium">${escapeHtml(tournament.creatorDisplayName)}</span>
        </div>
        ${tournament.winnerId ? `
        <div class="mt-3 pt-3 border-t border-gray-700">
          <div class="flex items-center gap-2">
            <span class="text-white font-medium">Winner: ${escapeHtml(tournament.winnerDisplayName || '')}</span>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    return card;
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function loadTournaments() {
    try {
      tournaments = await tournamentService.getTournamentList();
      loaderContainer.classList.add('hidden');
      applyFilter();
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      showError('Failed to load tournaments');
      loaderContainer.classList.add('hidden');
    }
  }

  loadTournaments();

  return container;
}
