


export interface ChatRoomData {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date | string;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
  type: 'direct' | 'group' | 'channel';
  participants?: number;
}


export type SelectRoomCallback = (roomId: string) => void;


export interface ChatRoomListOptions {
  rooms: ChatRoomData[];
  activeRoomId?: string;
  onSelect: SelectRoomCallback;
  showSearch?: boolean;
  emptyMessage?: string;
}


export function ChatRoomList(options: ChatRoomListOptions): HTMLElement {
  const {
    rooms,
    activeRoomId,
    onSelect,
    showSearch = true,
    emptyMessage = 'No conversations yet',
  } = options;

  
  const container = document.createElement('div');
  container.className = 'flex flex-col h-full bg-gray-800';

  
  if (showSearch) {
    const header = document.createElement('div');
    header.className = 'p-4 border-b border-gray-700';

    const searchContainer = document.createElement('div');
    searchContainer.className = 'relative';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search conversations...';
    searchInput.className = 'w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';

    const searchIcon = document.createElement('div');
    searchIcon.className = 'absolute left-3 top-2.5 text-gray-400';
    searchIcon.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    `;

    
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      const roomItems = roomListContainer.querySelectorAll('[data-room-id]');

      roomItems.forEach((item) => {
        const roomName = item.getAttribute('data-room-name')?.toLowerCase() || '';
        const lastMessage = item.getAttribute('data-last-message')?.toLowerCase() || '';

        if (roomName.includes(query) || lastMessage.includes(query)) {
          (item as HTMLElement).style.display = '';
        } else {
          (item as HTMLElement).style.display = 'none';
        }
      });
    });

    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(searchInput);
    header.appendChild(searchContainer);
    container.appendChild(header);
  }

  
  const roomListContainer = document.createElement('div');
  roomListContainer.className = 'flex-1 overflow-y-auto';
  roomListContainer.id = 'chatRoomListContainer';

  if (rooms.length === 0) {
    
    const emptyState = document.createElement('div');
    emptyState.className = 'flex flex-col items-center justify-center h-full text-center p-8';
    emptyState.innerHTML = `
      <svg class="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <p class="text-gray-400 text-sm">${emptyMessage}</p>
    `;
    roomListContainer.appendChild(emptyState);
  } else {
    
    rooms.forEach((room) => {
      const roomItem = createRoomItem(room, room.id === activeRoomId, onSelect);
      roomListContainer.appendChild(roomItem);
    });
  }

  container.appendChild(roomListContainer);

  return container;
}


function createRoomItem(
  room: ChatRoomData,
  isActive: boolean,
  onSelect: SelectRoomCallback
): HTMLElement {
  const item = document.createElement('div');
  item.className = `flex items-center gap-3 p-4 cursor-pointer transition-colors ${
    isActive
      ? 'bg-gray-700'
      : 'hover:bg-gray-700/50'
  }`;
  item.setAttribute('data-room-id', room.id);
  item.setAttribute('data-room-name', room.name);
  item.setAttribute('data-last-message', room.lastMessage || '');

  item.addEventListener('click', () => {
    onSelect(room.id);
  });

  
  const avatarContainer = document.createElement('div');
  avatarContainer.className = 'relative flex-shrink-0';

  const avatar = document.createElement('div');
  avatar.className = 'w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center';

  if (room.avatar) {
    avatar.innerHTML = `<img src="${room.avatar}" alt="${room.name}" class="w-full h-full object-cover" />`;
  } else {
    
    const initials = room.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    avatar.innerHTML = `<span class="text-sm font-semibold text-white">${initials}</span>`;
  }

  avatarContainer.appendChild(avatar);

  
  if (room.type === 'direct' && room.isOnline) {
    const onlineIndicator = document.createElement('div');
    onlineIndicator.className = 'absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800';
    avatarContainer.appendChild(onlineIndicator);
  }

  item.appendChild(avatarContainer);

  
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 min-w-0';

  
  const nameTimeRow = document.createElement('div');
  nameTimeRow.className = 'flex justify-between items-baseline mb-1';

  const nameContainer = document.createElement('div');
  nameContainer.className = 'flex items-center gap-2';

  const name = document.createElement('div');
  name.className = `font-semibold text-white truncate ${room.unreadCount ? 'text-white' : 'text-gray-300'}`;
  name.textContent = room.name;
  nameContainer.appendChild(name);

  
  if (room.type === 'group' || room.type === 'channel') {
    const typeIcon = document.createElement('span');
    typeIcon.className = 'text-gray-500 text-xs';
    typeIcon.innerHTML = room.type === 'group'
      ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
         </svg>`
      : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
         </svg>`;
    nameContainer.appendChild(typeIcon);
  }

  nameTimeRow.appendChild(nameContainer);

  
  if (room.lastMessageTime) {
    const time = document.createElement('div');
    time.className = 'text-xs text-gray-400 flex-shrink-0';
    const date = typeof room.lastMessageTime === 'string'
      ? new Date(room.lastMessageTime)
      : room.lastMessageTime;
    time.textContent = formatTime(date);
    nameTimeRow.appendChild(time);
  }

  contentArea.appendChild(nameTimeRow);

  
  const messageRow = document.createElement('div');
  messageRow.className = 'flex justify-between items-center gap-2';

  const lastMessage = document.createElement('div');
  lastMessage.className = `text-sm truncate ${
    room.unreadCount ? 'text-white font-medium' : 'text-gray-400'
  }`;

  if (room.isTyping) {
    lastMessage.innerHTML = `<span class="text-purple-400 italic">Typing...</span>`;
  } else if (room.lastMessage) {
    lastMessage.textContent = room.lastMessage;
  } else {
    lastMessage.innerHTML = `<span class="text-gray-500 italic">No messages yet</span>`;
  }

  messageRow.appendChild(lastMessage);

  
  if (room.unreadCount && room.unreadCount > 0) {
    const badge = document.createElement('div');
    badge.className = 'flex-shrink-0 bg-purple-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-2 flex items-center justify-center';
    badge.textContent = room.unreadCount > 99 ? '99+' : String(room.unreadCount);
    messageRow.appendChild(badge);
  }

  contentArea.appendChild(messageRow);

  item.appendChild(contentArea);

  return item;
}


function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m`;
  } else if (hours < 24) {
    return `${hours}h`;
  } else if (days < 7) {
    return `${days}d`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}


export function updateRoomInList(
  container: HTMLElement,
  roomId: string,
  updates: Partial<ChatRoomData>
): void {
  const roomElement = container.querySelector(`[data-room-id="${roomId}"]`);
  if (!roomElement) return;

  
  if (updates.name) {
    roomElement.setAttribute('data-room-name', updates.name);
  }
  if (updates.lastMessage) {
    roomElement.setAttribute('data-last-message', updates.lastMessage);
  }

  
  
  if (updates.lastMessage) {
    const messageEl = roomElement.querySelector('.text-sm.truncate');
    if (messageEl) {
      messageEl.textContent = updates.lastMessage;
    }
  }

  if (updates.unreadCount !== undefined) {
    const badgeEl = roomElement.querySelector('.bg-purple-600');
    if (updates.unreadCount > 0) {
      if (badgeEl) {
        badgeEl.textContent = updates.unreadCount > 99 ? '99+' : String(updates.unreadCount);
      }
    } else if (badgeEl) {
      badgeEl.remove();
    }
  }
}
