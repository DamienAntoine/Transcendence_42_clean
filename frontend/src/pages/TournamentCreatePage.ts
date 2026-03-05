import { Navbar } from '@/components/Navbar';
import { router } from '@/router';
import { tournamentService } from '@/services/TournamentService';
import { showError, showSuccess } from '@/components/Notification';

export function TournamentCreatePage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gray-900';

  const navbar = Navbar();
  container.appendChild(navbar);

  const main = document.createElement('main');
  main.className = 'pt-20 px-4 pb-12';

  const maxWidth = document.createElement('div');
  maxWidth.className = 'max-w-2xl mx-auto';

  const header = document.createElement('div');
  header.className = 'text-center mb-8';
  header.innerHTML = '<div class="text-6xl mb-4">🏆</div><h1 class="text-4xl font-bold text-white mb-2">Create Tournament</h1><p class="text-gray-400">Set up a new competitive tournament</p>';
  maxWidth.appendChild(header);

  const form = document.createElement('form');
  form.className = 'bg-gray-800 rounded-lg p-8 space-y-6';

  const nameGroup = document.createElement('div');
  nameGroup.innerHTML = '<label for="name" class="block text-sm font-medium text-gray-300 mb-2">Tournament Name *</label><input type="text" id="name" name="name" required class="w-full px-4 py-3 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Epic Championship 2025" />';
  form.appendChild(nameGroup);

  const infoParticipants = document.createElement('div');
  infoParticipants.className = 'text-sm text-gray-400';
  infoParticipants.textContent = 'Note: The bracket is generated from joined players when the tournament starts.';
  form.appendChild(infoParticipants);

  const infoBox = document.createElement('div');
  infoBox.className = 'bg-blue-900/20 border border-blue-700 rounded-lg p-4';
  infoBox.innerHTML = '<div class="flex gap-3"><div class="text-2xl">ℹ️</div><div class="text-sm text-blue-200"><p class="font-medium mb-1">Tournament Format</p><p>Single elimination bracket. Players who lose are eliminated. The winner advances to the next round.</p></div></div>';
  form.appendChild(infoBox);

  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'flex gap-4';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => router.navigate('/tournaments'));

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  submitBtn.textContent = 'Create Tournament';

  buttonsDiv.appendChild(cancelBtn);
  buttonsDiv.appendChild(submitBtn);
  form.appendChild(buttonsDiv);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const name = formData.get('name') as string;

    if (!name || name.trim().length < 3) {
      showError('Tournament name must be at least 3 characters');
      return;
    }

    const start_time = new Date().toISOString();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const tournament = await tournamentService.createTournament({
        name: name.trim(),
        start_time,
      });

      showSuccess('Tournament created successfully!');
      router.navigate(`/tournaments/${tournament.id}`);
    } catch (error) {
      console.error('Failed to create tournament:', error);
      const msg = error instanceof Error ? error.message : 'Failed to create tournament.';
      showError(msg);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Tournament';
    }
  });

  maxWidth.appendChild(form);
  main.appendChild(maxWidth);
  container.appendChild(main);

  return container;
}
