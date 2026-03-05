

import { createElement } from '@/utils/dom';
import { User } from '@/types';
import { router } from '@/router';
import { Avatar } from '@/components/Avatar';


export interface UserCardOptions {
  user: User & { isOnline?: boolean };
  showStats?: boolean;
  showActions?: boolean;
  onAddFriend?: (userId: number) => void;
  onRemoveFriend?: (userId: number) => void;
  onBlock?: (userId: number) => void;
  onUnblock?: (userId: number) => void;
  onChallenge?: (userId: number) => void;
  onViewProfile?: (userId: number) => void;
  onAvatarClick?: () => void;
}


export function UserCard(options: UserCardOptions): HTMLElement {
  const {
    user,
    showStats = true,
    showActions = true,
    onAddFriend,
    onRemoveFriend,
    onBlock,
    onUnblock,
    onChallenge,
    onViewProfile,
    onAvatarClick,
  } = options;

  const card = createElement('div', {
    className: 'bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow',
  });


  const header = createHeader(user, onViewProfile, onAvatarClick);
  card.appendChild(header);


  const body = createElement('div', {
    className: 'p-4',
  });


  const nameSection = createNameSection(user);
  body.appendChild(nameSection);


  if (showStats) {
    const stats = createStatsSection(user);
    body.appendChild(stats);
  }

  card.appendChild(body);


  if (showActions) {
    const actions = createActionsSection(user, {
      onAddFriend,
      onRemoveFriend,
      onBlock,
      onUnblock,
      onChallenge,
      onViewProfile,
    });
    card.appendChild(actions);
  }

  return card;
}


function createHeader(user: User & { isOnline?: boolean }, onViewProfile?: (userId: number) => void, onAvatarClick?: () => void): HTMLElement {
  const header = createElement('div', {
    className: 'relative h-32 bg-gradient-to-br from-primary-600 to-primary-800',
  });

  const profilePicWrapper = createElement('div', {
    className: 'absolute -bottom-12 left-1/2 transform -translate-x-1/2',
  });

  const profilePic = Avatar({ displayName: user.displayName, src: user.profilePicture, className: 'w-24 h-24 rounded-full border-4 border-gray-800 cursor-pointer hover:opacity-80 transition' });

  profilePic.addEventListener('click', (e) => {
    if (onAvatarClick) {
      e.stopPropagation();
      onAvatarClick();
    } else if (onViewProfile) {
      onViewProfile(user.id);
    } else {
      router.navigate(`/profile/${user.id}`);
    }
  });


  const statusIndicator = createElement('div', {
    className: `status-dot absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-gray-800 ${
      user.isOnline ? 'bg-green-500' : 'bg-gray-500'
    }`,
  });

  profilePicWrapper.appendChild(profilePic);
  profilePicWrapper.appendChild(statusIndicator);
  header.appendChild(profilePicWrapper);

  return header;
}


function createNameSection(user: User & { isOnline?: boolean }): HTMLElement {
  const section = createElement('div', {
    className: 'text-center mt-14 mb-4',
  });

  const displayName = createElement('h3', {
    className: 'text-xl font-bold text-white mb-1',
    textContent: user.displayName,
  });

  const username = createElement('p', {
    className: 'text-gray-400 text-sm mb-2',
    textContent: `@${user.userName}`,
  });

  const status = createElement('span', {
    className: `status-text inline-block px-3 py-1 rounded-full text-xs ${
      user.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-300'
    }`,
    textContent: user.isOnline ? 'Online' : 'Offline',
  });

  section.appendChild(displayName);
  section.appendChild(username);
  section.appendChild(status);

  return section;
}


function createStatsSection(user: User): HTMLElement {
  const section = createElement('div', {
    className: 'grid grid-cols-3 gap-4 py-4 border-t border-gray-700',
  });

  const wins = user.wins ?? 0;
  const losses = user.losses ?? 0;
  const total = wins + losses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'Wins', value: wins },
    { label: 'Loses', value: losses },
    { label: 'Win Rate', value: `${winRate}%` },
  ];

  stats.forEach((stat) => {
    const statDiv = createElement('div', {
      className: 'text-center',
    });

    const value = createElement('div', {
      className: 'text-2xl font-bold text-white',
      textContent: String(stat.value),
    });

    const label = createElement('div', {
      className: 'text-xs text-gray-400 mt-1',
      textContent: stat.label,
    });

    statDiv.appendChild(value);
    statDiv.appendChild(label);
    section.appendChild(statDiv);
  });

  return section;
}


function createActionsSection(
  user: User,
  handlers: {
    onAddFriend?: (userId: number) => void;
    onRemoveFriend?: (userId: number) => void;
    onBlock?: (userId: number) => void;
    onUnblock?: (userId: number) => void;
    onChallenge?: (userId: number) => void;
    onViewProfile?: (userId: number) => void;
  }
): HTMLElement {
  const section = createElement('div', {
    className: 'flex gap-2 p-4 bg-gray-900 border-t border-gray-700',
  });

  const actions: Array<{
    label: string;
    className: string;
    handler?: (userId: number) => void;
    show: boolean;
  }> = [
    {
      label: 'Challenge',
      className: 'flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition',
      handler: handlers.onChallenge,
      show: !!handlers.onChallenge,
    },
    {
      label: 'Add friend',
      className: 'flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition',
      handler: handlers.onAddFriend,
      show: !!handlers.onAddFriend,
    },
    {
      label: 'Remove friend',
      className: 'flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition',
      handler: handlers.onRemoveFriend,
      show: !!handlers.onRemoveFriend,
    },
    {
      label: 'Block',
      className: 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition',
      handler: handlers.onBlock,
      show: !!handlers.onBlock,
    },
    {
      label: 'Unblock',
      className: 'px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium transition',
      handler: handlers.onUnblock,
      show: !!handlers.onUnblock,
    },
  ];

  actions
    .filter((action) => action.show)
    .forEach((action) => {
      const button = createElement('button', {
        className: action.className,
        textContent: action.label,
      });

      if (action.handler) {
        button.addEventListener('click', () => action.handler!(user.id));
      }

      section.appendChild(button);
    });

  return section;
}


export function UserCardMini(
  user: User & { isOnline?: boolean },
  onClick?: (userId: number) => void
): HTMLElement {
  const card = createElement('div', {
    className: 'flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition cursor-pointer',
  });

  card.addEventListener('click', () => {
    if (onClick) {
      onClick(user.id);
    } else {
      router.navigate(`/profile/${user.id}`);
    }
  });


  const profilePicWrapper = createElement('div', {
    className: 'relative flex-shrink-0',
  });

  const profilePic = Avatar({ displayName: user.displayName, src: user.profilePicture, className: 'w-12 h-12' });

  const statusIndicator = createElement('div', {
    className: `status-dot absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
      user.isOnline ? 'bg-green-500' : 'bg-gray-500'
    }`,
  });

  profilePicWrapper.appendChild(profilePic);
  profilePicWrapper.appendChild(statusIndicator);
  card.appendChild(profilePicWrapper);


  const info = createElement('div', {
    className: 'flex-1 min-w-0',
  });

  const displayName = createElement('div', {
    className: 'text-white font-medium truncate',
    textContent: user.displayName,
  });

  const username = createElement('div', {
    className: 'text-gray-400 text-sm truncate',
    textContent: `@${user.userName}`,
  });

  info.appendChild(displayName);
  info.appendChild(username);
  card.appendChild(info);


  if (user.wins !== undefined && user.losses !== undefined) {
    const stats = createElement('div', {
      className: 'text-right flex-shrink-0',
    });

    const wins = createElement('div', {
      className: 'text-green-400 text-sm font-medium',
      textContent: `${user.wins}W`,
    });

    const losses = createElement('div', {
      className: 'text-red-400 text-sm',
      textContent: `${user.losses}L`,
    });

    stats.appendChild(wins);
    stats.appendChild(losses);
    card.appendChild(stats);
  }

  return card;
}
