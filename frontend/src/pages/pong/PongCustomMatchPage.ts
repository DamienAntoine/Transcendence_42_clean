

import { createElement } from '@/utils/dom';
import { Navbar } from '@/components/Navbar';
import { router } from '@/router';
import { showError, showSuccess } from '@/components/Notification';
import { friendsService } from '@/services/FriendsService';
import { userService } from '@/services/UserService';
import { getUser } from '@/utils/storage';
import { customMatchService } from '@/services/CustomMatchService';
import type { CustomMatchSettings } from '@/services/CustomMatchService';

interface LocalSettings extends CustomMatchSettings {
  invitedFriendId?: number;
}

export function PongCustomMatchPage(): HTMLElement {
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

  const backButton = createElement('button', {
    className: 'text-gray-400 hover:text-white mb-4 flex items-center gap-2',
    innerHTML: '← Retour au menu',
  });

  backButton.addEventListener('click', () => {
    router.navigate('/pong');
  });

  const title = createElement('h1', {
    className: 'text-4xl font-bold text-white mb-2',
    textContent: 'Match Personnalisé',
  });

  const subtitle = createElement('p', {
    className: 'text-gray-400',
    textContent: 'Configurez votre partie et invitez un ami',
  });

  header.appendChild(backButton);
  header.appendChild(title);
  header.appendChild(subtitle);
  maxWidth.appendChild(header);


  const formCard = createSettingsForm();
  maxWidth.appendChild(formCard);

  main.appendChild(maxWidth);
  container.appendChild(main);

  return container;
}


function createSettingsForm(): HTMLElement {
  const card = createElement('div', {
    className: 'bg-gray-800 rounded-lg p-6 shadow-xl',
  });

  const settings: LocalSettings = {
    paddleSize: 20,
    gameSpeed: 1,
    powerups: {
      bigPaddle: false,
      shield: false,
    },
  };


  const gameSettingsSection = createElement('div', {
    className: 'mb-8',
  });

  const gameSettingsTitle = createElement('h2', {
    className: 'text-2xl font-bold text-white mb-4',
    textContent: 'Paramètres de jeu',
  });

  gameSettingsSection.appendChild(gameSettingsTitle);


  const paddleSizeControl = createSliderControl(
    'Taille des paddles',
    'paddleSize',
    10,
    40,
    20,
    (value) => {
      settings.paddleSize = value;
    }
  );
  gameSettingsSection.appendChild(paddleSizeControl);


  const speedControl = createSliderControl(
    'Vitesse du jeu',
    'gameSpeed',
    0.5,
    2,
    1,
    (value) => {
      settings.gameSpeed = value;
    },
    0.1
  );
  gameSettingsSection.appendChild(speedControl);

  card.appendChild(gameSettingsSection);


  const powerupsSection = createElement('div', {
    className: 'mb-8',
  });

  const powerupsTitle = createElement('h2', {
    className: 'text-2xl font-bold text-white mb-4',
    textContent: 'Power-ups',
  });

  powerupsSection.appendChild(powerupsTitle);


  const bigPaddleToggle = createToggleControl(
    'Paddle géant',
    'Augmente temporairement la taille de votre paddle',
    '🏓',
    (enabled) => {
      settings.powerups.bigPaddle = enabled;
    }
  );
  powerupsSection.appendChild(bigPaddleToggle);


  const shieldToggle = createToggleControl(
    'Bouclier',
    'Protège votre côté pendant quelques secondes',
    '🛡️',
    (enabled) => {
      settings.powerups.shield = enabled;
    }
  );
  powerupsSection.appendChild(shieldToggle);

  card.appendChild(powerupsSection);


  const inviteSection = createElement('div', {
    className: 'mb-8',
  });

  const inviteTitle = createElement('h2', {
    className: 'text-2xl font-bold text-white mb-4',
    textContent: 'Inviter un ami',
  });

  inviteSection.appendChild(inviteTitle);

  const friendsList = createElement('div', {
    id: 'friendsList',
    className: 'space-y-2 mb-4',
  });

  inviteSection.appendChild(friendsList);

  card.appendChild(inviteSection);


  const actions = createElement('div', {
    className: 'flex gap-4',
  });

  const createButton = createElement('button', {
    className:
      'flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition',
    textContent: 'Créer le match',
  });

  createButton.addEventListener('click', async () => {
    await handleCreateMatch(settings);
  });

  actions.appendChild(createButton);
  card.appendChild(actions);


  loadFriendsList(friendsList, (friendId) => {
    settings.invitedFriendId = friendId;
    console.log('✅ Friend selected:', friendId);
  });


  const refreshInterval = setInterval(() => {
    loadFriendsList(friendsList, (friendId) => {
      settings.invitedFriendId = friendId;
      console.log('✅ Friend selected (refresh):', friendId);
    });
  }, 10000);


  window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
  });

  return card;
}


function createSliderControl(
  label: string,
  id: string,
  min: number,
  max: number,
  defaultValue: number,
  onChange: (value: number) => void,
  step: number = 1
): HTMLElement {
  const control = createElement('div', {
    className: 'mb-6',
  });

  const labelEl = createElement('label', {
    className: 'block text-white font-semibold mb-2',
    textContent: label,
  });

  const valueDisplay = createElement('span', {
    className: 'text-primary-400 ml-2',
    textContent: defaultValue.toString(),
  });

  labelEl.appendChild(valueDisplay);
  control.appendChild(labelEl);

  const slider = createElement('input', {
    className: 'w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600',
    attributes: {
      type: 'range',
      id,
      min: min.toString(),
      max: max.toString(),
      step: step.toString(),
      value: defaultValue.toString(),
    },
  }) as HTMLInputElement;

  slider.addEventListener('input', () => {
    const value = parseFloat(slider.value);
    valueDisplay.textContent = value.toString();
    onChange(value);
  });

  control.appendChild(slider);

  return control;
}


function createToggleControl(
  title: string,
  description: string,
  icon: string,
  onChange: (enabled: boolean) => void
): HTMLElement {
  const control = createElement('div', {
    className:
      'flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-3 hover:bg-gray-600 transition cursor-pointer',
  });

  const info = createElement('div', {
    className: 'flex items-center gap-3',
  });

  const iconEl = createElement('div', {
    className: 'text-3xl',
    textContent: icon,
  });

  const textContainer = createElement('div');

  const titleEl = createElement('div', {
    className: 'text-white font-semibold',
    textContent: title,
  });

  const descEl = createElement('div', {
    className: 'text-sm text-gray-400',
    textContent: description,
  });

  textContainer.appendChild(titleEl);
  textContainer.appendChild(descEl);

  info.appendChild(iconEl);
  info.appendChild(textContainer);

  const toggle = createElement('div', {
    className: 'relative w-12 h-6 bg-gray-600 rounded-full transition-colors',
  });

  const toggleButton = createElement('div', {
    className:
      'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
  });

  toggle.appendChild(toggleButton);

  let enabled = false;

  control.addEventListener('click', () => {
    enabled = !enabled;
    if (enabled) {
      toggle.classList.add('bg-primary-600');
      toggleButton.style.transform = 'translateX(24px)';
    } else {
      toggle.classList.remove('bg-primary-600');
      toggleButton.style.transform = 'translateX(0)';
    }
    onChange(enabled);
  });

  control.appendChild(info);
  control.appendChild(toggle);

  return control;
}


async function loadFriendsList(
  container: HTMLElement,
  onSelect: (friendId: number) => void
): Promise<void> {
  try {
    const friendsIds = await friendsService.getFriendsList();
    const friendsStatus = await friendsService.getFriendsStatus();

    console.log('Friends IDs:', friendsIds);
    console.log('Friends Status:', friendsStatus);

    if (friendsIds.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <p class="mb-2">Vous n'avez pas encore d'amis</p>
          <p class="text-sm">Ajoutez des amis pour pouvoir les inviter !</p>
        </div>
      `;
      return;
    }


    const friendsPromises = friendsIds.map(async (friendId) => {
      try {
        const friend = await userService.getUserById(friendId);
        const isOnline = friendsStatus[friendId] === true;
        console.log(`Friend ${friendId} (${friend.displayName}): online = ${isOnline}`);
        return {
          ...friend,
          online: isOnline,
        };
      } catch (error) {
        console.error(`Failed to load friend ${friendId}:`, error);
        return null;
      }
    });

    const friends = (await Promise.all(friendsPromises)).filter((f) => f !== null);


    container.innerHTML = '';

    friends.forEach((friend) => {
      if (!friend) return;

      const friendCard = createElement('div', {
        className:
          'flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition border-2 border-transparent',
      });

      friendCard.setAttribute('data-friend-id', friend.id.toString());

      const avatar = createElement('div', {
        className:
          'w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold',
        textContent: friend.displayName.substring(0, 2).toUpperCase(),
      });

      const info = createElement('div', {
        className: 'flex-1',
      });

      const name = createElement('div', {
        className: 'text-white font-semibold',
        textContent: friend.displayName,
      });

      const status = createElement('div', {
        className: `text-sm ${friend.online ? 'text-green-400' : 'text-gray-400'}`,
        textContent: friend.online ? 'Online' : 'Offline',
      });

      info.appendChild(name);
      info.appendChild(status);

      friendCard.appendChild(avatar);
      friendCard.appendChild(info);

      friendCard.addEventListener('click', () => {

        container.querySelectorAll('[data-friend-id]').forEach((el) => {
          el.classList.remove('border-primary-600');
        });


        friendCard.classList.add('border-primary-600');
        onSelect(friend.id);
      });

      container.appendChild(friendCard);
    });
  } catch (error) {
    showError('Impossible de charger la liste d\'amis');
    console.error('Failed to load friends:', error);
  }
}


async function handleCreateMatch(settings: LocalSettings): Promise<void> {
  const currentUser = getUser();

  console.log('🎮 Creating custom match with settings:', settings);

  if (!currentUser) {
    showError('Vous devez être connecté');
    router.navigate('/login');
    return;
  }

  if (!settings.invitedFriendId) {
    showError('Veuillez sélectionner un ami à inviter');
    console.log('❌ No friend selected');
    return;
  }

  console.log(`📨 Sending invitation to user ${settings.invitedFriendId}`);

  try {

    const invitation = await customMatchService.sendInvitation(
      settings.invitedFriendId,
      {
        paddleSize: settings.paddleSize,
        gameSpeed: settings.gameSpeed,
        powerups: settings.powerups,
      }
    );

    console.log('✅ Invitation sent successfully:', invitation);
    showSuccess('Invitation envoyée ! En attente de la réponse...');


    sessionStorage.setItem('pendingInvitation', JSON.stringify(invitation));


    router.navigate('/');
  } catch (error) {
    showError('Impossible d\'envoyer l\'invitation');
    console.error('Failed to create custom match:', error);
  }
}
