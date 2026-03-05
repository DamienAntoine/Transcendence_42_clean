import { createElement } from '@/utils/dom';
import { friendsService } from '@/services/FriendsService';
import { userService } from '@/services/UserService';
import { getUser, isAuthenticated } from '@/utils/storage';
import { showError } from './Notification';
import { openCustomMatchModal } from './CustomMatchModal';
import { WebSocketManager } from '@/services/WebSocketManager';
import { statusWebSocketService } from '@/services/StatusWebSocketService';
import { getToken } from '@/utils/storage';
import type { User } from '@/types';
import type { DmWSMessage } from '@/types/Chat';
import { Avatar } from '@/components/Avatar';

interface ChatWindow {
  friendId: number;
  friend: User;
  isMinimized: boolean;
  element: HTMLElement;
  ws: WebSocketManager<DmWSMessage> | null;
}

export class FriendsWidget {
  private container: HTMLElement | null = null;
  private friendsList: User[] = [];
  private chatWindows: Map<number, ChatWindow> = new Map();
  private isOpen: boolean = false;
  private updateInterval: number | null = null;
  private statusUnsubscribe: (() => void) | null = null;

  init(): HTMLElement {
    this.container = createElement('div', {
      className: 'fixed bottom-0 right-4 z-50 flex items-end gap-2',
    });

    const friendsButton = this.createFriendsButton();
    this.container.appendChild(friendsButton);

    if (isAuthenticated()) {
      this.loadFriends();

      this.statusUnsubscribe = statusWebSocketService.onStatusChange((userId, isOnline) => {
        this.handleStatusChange(userId, isOnline);
      });

      this.updateInterval = window.setInterval(() => {
        if (!isAuthenticated()) {
          if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
          }
          return;
        }
        this.loadFriends();
      }, 60000);
    }

    return this.container;
  }

  private createFriendsButton(): HTMLElement {
    const button = createElement('div', {
      className: 'bg-white dark:bg-gray-800 rounded-t-lg shadow-lg w-64 cursor-pointer',
    });

    const header = createElement('div', {
      className: 'flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700',
    });

    header.addEventListener('click', () => {
      this.toggleFriendsList();
    });

    const title = createElement('div', {
      className: 'flex items-center gap-2',
    });

    const icon = createElement('span', {
      className: 'text-xl',
      textContent: '👥',
    });

    const text = createElement('span', {
      className: 'font-semibold text-gray-800 dark:text-white',
      textContent: 'Friends',
    });

    title.appendChild(icon);
    title.appendChild(text);

    const arrow = createElement('span', {
      className: 'text-gray-600 dark:text-gray-400',
      textContent: '▼',
      id: 'friends-arrow',
    });

    header.appendChild(title);
    header.appendChild(arrow);
    button.appendChild(header);

    const friendsListContainer = createElement('div', {
      className: 'hidden max-h-96 overflow-y-auto',
      id: 'friends-list-container',
    });

    button.appendChild(friendsListContainer);

    return button;
  }

  private toggleFriendsList(): void {
    this.isOpen = !this.isOpen;
    const listContainer = document.getElementById('friends-list-container');
    const arrow = document.getElementById('friends-arrow');

    if (listContainer && arrow) {
      if (this.isOpen) {
        listContainer.classList.remove('hidden');
        arrow.textContent = '▲';
      } else {
        listContainer.classList.add('hidden');
        arrow.textContent = '▼';
      }
    }
  }

  private async loadFriends(): Promise<void> {
    if (!isAuthenticated()) return;
    try {
      const friendIds = await friendsService.getFriendsList();
      const status = await friendsService.getFriendsStatus();

      const friendsPromises = friendIds.map(async (id) => {
        try {
          const user = await userService.getUserById(id);
          return {
            ...user,
            isOnline: status[id] || false,
          };
        } catch (error) {
          console.error(`Failed to fetch user ${id}:`, error);
          return null;
        }
      });

      const friends = (await Promise.all(friendsPromises)).filter(
        (f): f is User & { isOnline: boolean } => f !== null
      );

      this.friendsList = friends;
      this.renderFriendsList();
    } catch (error) {
      console.error('Failed to load friends:', error);
      showError('Unable to load friends list');
    }
  }

  refresh(): void {
    this.loadFriends();
  }

  private handleStatusChange(userId: number, isOnline: boolean): void {
    const friendIndex = this.friendsList.findIndex(f => f.id === userId);
    if (friendIndex !== -1) {
      (this.friendsList[friendIndex] as any).isOnline = isOnline;
      this.renderFriendsList();
    }
  }

  private renderFriendsList(): void {
    const container = document.getElementById('friends-list-container');
    if (!container) return;

    container.innerHTML = '';

    if (this.friendsList.length === 0) {
      const empty = createElement('div', {
        className: 'px-4 py-8 text-center text-gray-500 dark:text-gray-400',
        textContent: 'No friends yet',
      });
      container.appendChild(empty);
      return;
    }

    const sortedFriends = [...this.friendsList].sort((a: any, b: any) => {
      if (a.isOnline === b.isOnline) return 0;
      return a.isOnline ? -1 : 1;
    });

    sortedFriends.forEach((friend: any) => {
    const friendItem = createElement('div', {
      className:
        'flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700',
    });

    const avatarContainer = createElement('div', {
      className: 'relative flex-shrink-0',
    });      const avatar = Avatar({ displayName: friend.displayName, src: friend.profilePicture, className: 'w-10 h-10' });

      const statusDot = createElement('div', {
        className: `absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
          friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
        }`,
      });

      avatarContainer.appendChild(avatar);
      avatarContainer.appendChild(statusDot);

      const nameDiv = createElement('div', {
        className: 'flex-1 min-w-0 cursor-pointer',
      });

      nameDiv.addEventListener('click', () => {
        this.openChatWindow(friend);
      });

      const name = createElement('div', {
        className: 'font-medium text-gray-900 dark:text-white truncate',
        textContent: friend.displayName,
      });

      const statusLabel = createElement('span', {
        className: `text-xs ${friend.isOnline ? 'text-green-500' : 'text-gray-400'}`,
        textContent: friend.isOnline ? 'Online' : 'Offline',
      });

      nameDiv.appendChild(name);
      nameDiv.appendChild(statusLabel);

      const viewProfileBtn = createElement('button', {
        className: 'px-3 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition',
        textContent: '👤 Profile',
        attributes: {
          title: 'View profile',
        },
      });

      viewProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `/profile/${friend.id}`;
      });

      friendItem.appendChild(avatarContainer);
      friendItem.appendChild(nameDiv);
      friendItem.appendChild(viewProfileBtn);
      container.appendChild(friendItem);
    });
  }

  private openChatWindow(friend: User): void {
    if (this.chatWindows.has(friend.id)) {
      const window = this.chatWindows.get(friend.id)!;
      window.isMinimized = false;
      this.renderChatWindow(window);
      return;
    }

    if (this.chatWindows.size >= 3) {
      showError('Maximum 3 conversations open at once');
      return;
    }

    const windowElement = this.createChatWindow(friend);

    const token = getToken();
    const apiUrl = import.meta.env.VITE_API_URL || (() => {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const port = window.location.port || '3000';
      return `${protocol}//${hostname}:${port === '5173' ? '3000' : port}`;
    })();
    const wsBaseUrl = apiUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/ws/chat/dm/${friend.id}?token=${token}`;
    const ws = new WebSocketManager<DmWSMessage>(wsUrl, {
      reconnect: true,
      debug: true,
    });

    ws.onMessage((message) => this.handleDmMessage(friend.id, message));
    ws.onError((error) => console.error(`DM WebSocket error with ${friend.id}:`, error));

    ws.connect();

    const chatWindow: ChatWindow = {
      friendId: friend.id,
      friend,
      isMinimized: false,
      element: windowElement,
      ws,
    };

    this.chatWindows.set(friend.id, chatWindow);
    this.container?.appendChild(windowElement);
  }

  private createChatWindow(friend: User): HTMLElement {
    const window = createElement('div', {
      className: 'bg-white dark:bg-gray-800 rounded-t-lg shadow-lg w-80 flex flex-col',
      attributes: {
        style: 'height: 400px',
      },
    });

    const header = createElement('div', {
      className:
        'flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer',
    });

    header.addEventListener('click', () => {
      const chatWindow = this.chatWindows.get(friend.id);
      if (chatWindow) {
        chatWindow.isMinimized = !chatWindow.isMinimized;
        this.renderChatWindow(chatWindow);
      }
    });

    const headerLeft = createElement('div', {
      className: 'flex items-center gap-2',
    });

    const avatar = Avatar({ displayName: friend.displayName, src: friend.profilePicture, className: 'w-8 h-8' });

    const name = createElement('span', {
      className: 'font-semibold text-gray-900 dark:text-white',
      textContent: friend.displayName,
    });

    headerLeft.appendChild(avatar);
    headerLeft.appendChild(name);

    const headerRight = createElement('div', {
      className: 'flex items-center gap-2',
    });

    const challengeBtn = createElement('button', {
      className: 'text-primary-500 hover:text-primary-600 text-xl',
      textContent: '🎮',
      attributes: {
        title: 'Invite to play',
      },
    });

    challengeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCustomMatchModal(friend);
    });

    const closeBtn = createElement('button', {
      className: 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
      textContent: '✕',
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeChatWindow(friend.id);
    });

    headerRight.appendChild(challengeBtn);
    headerRight.appendChild(closeBtn);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    window.appendChild(header);

    const messagesContainer = createElement('div', {
      className: 'flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900',
      id: `chat-messages-${friend.id}`,
    });

    window.appendChild(messagesContainer);

    const inputContainer = createElement('div', {
      className: 'p-3 border-t border-gray-200 dark:border-gray-700',
    });

    const input = createElement('input', {
      className:
        'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500',
      attributes: {
        type: 'text',
        placeholder: 'Type a message...',
      },
    }) as HTMLInputElement;

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        this.sendMessage(friend.id, input.value.trim());
        input.value = '';
      }
    });

    inputContainer.appendChild(input);
    window.appendChild(inputContainer);

    return window;
  }

  private renderChatWindow(chatWindow: ChatWindow): void {
    const messagesContainer = chatWindow.element.querySelector(
      `#chat-messages-${chatWindow.friendId}`
    ) as HTMLElement;
    const inputContainer = chatWindow.element.querySelector('.p-3.border-t') as HTMLElement;

    if (chatWindow.isMinimized) {
      messagesContainer?.classList.add('hidden');
      inputContainer?.classList.add('hidden');
      chatWindow.element.style.height = 'auto';
    } else {
      messagesContainer?.classList.remove('hidden');
      inputContainer?.classList.remove('hidden');
      chatWindow.element.style.height = '400px';
    }
  }

  private createMessageBubble(content: string, isOwn: boolean): HTMLElement {
    const bubble = createElement('div', {
      className: `flex ${isOwn ? 'justify-end' : 'justify-start'}`,
    });

    const message = createElement('div', {
      className: `px-3 py-2 rounded-lg max-w-xs ${
        isOwn
          ? 'bg-primary-500 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
      }`,
      textContent: content,
    });

    bubble.appendChild(message);
    return bubble;
  }

  private sendMessage(friendId: number, content: string): void {
    const chatWindow = this.chatWindows.get(friendId);
    if (!chatWindow || !chatWindow.ws) return;

    chatWindow.ws.send({ type: 'SEND_MESSAGE', message: content });
  }

  private handleDmMessage(friendId: number, message: any): void {
    const container = document.getElementById(`chat-messages-${friendId}`);
    if (!container) return;

    if (message.type === 'DM_MESSAGE') {
      const currentUser = getUser();
      const isMe = currentUser ? message.senderId === currentUser.id : false;

      const messageBubble = this.createMessageBubble(message.message, isMe);
      container.appendChild(messageBubble);
      container.scrollTop = container.scrollHeight;
    } else if (message.type === 'HISTORY') {
      container.innerHTML = '';
      message.messages.forEach((msg: any) => {
        const currentUser = getUser();
        const isMe = currentUser ? msg.senderId === currentUser.id : false;
        const messageBubble = this.createMessageBubble(msg.message, isMe);
        container.appendChild(messageBubble);
      });
      container.scrollTop = container.scrollHeight;
    }
  }

  private closeChatWindow(friendId: number): void {
    const chatWindow = this.chatWindows.get(friendId);
    if (chatWindow) {
      if (chatWindow.ws) {
        chatWindow.ws.disconnect();
      }
      chatWindow.element.remove();
      this.chatWindows.delete(friendId);
    }
  }

  destroy(): void {
    if (this.statusUnsubscribe) {
      this.statusUnsubscribe();
      this.statusUnsubscribe = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.chatWindows.forEach((window) => {
      if (window.ws) {
        window.ws.disconnect();
      }
      window.element.remove();
    });
    this.chatWindows.clear();
    this.container?.remove();
  }
}

let friendsWidgetInstance: FriendsWidget | null = null;

export function initFriendsWidget(): HTMLElement {
  if (!friendsWidgetInstance) {
    friendsWidgetInstance = new FriendsWidget();
  }
  return friendsWidgetInstance.init();
}

export function destroyFriendsWidget(): void {
  if (friendsWidgetInstance) {
    friendsWidgetInstance.destroy();
    friendsWidgetInstance = null;
  }
}

export function refreshFriendsWidget(): void {
  if (friendsWidgetInstance) {
    friendsWidgetInstance.refresh();
  }
}
