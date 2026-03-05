

import { Navbar } from '@/components/Navbar';
import { chatService } from '@/services/ChatService';
import { userService } from '@/services/UserService';
import { ChatMessageData, groupMessages, renderMessageGroup } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { showError } from '@/components/Notification';
import type { ChatWSMessage } from '@/types';
import { WebSocketManager, WebSocketState } from '@/services/WebSocketManager';
import { getUser } from '@/utils/storage';

export function ChatPage(): HTMLElement {
  const messages: ChatMessageData[] = [];
  let ws: WebSocketManager<ChatWSMessage> | null = null;
  const currentUser = getUser();
  const currentUserId = currentUser?.id || null;

  const userAvatarCache: Map<number, string | undefined> = new Map();

  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gray-900';

  const navbar = Navbar();
  container.appendChild(navbar);

  const main = document.createElement('main');
  main.className = 'pt-20 px-4 pb-12';

  const maxWidth = document.createElement('div');
  maxWidth.className = 'max-w-7xl mx-auto';

  const card = document.createElement('div');
  card.className = 'bg-gray-800 rounded-lg shadow-xl overflow-hidden';

  const header = document.createElement('div');
  header.className = 'bg-gray-800 p-4 border-b border-gray-700';
  header.innerHTML = '<div class="flex items-center justify-between"><h2 class="text-xl font-bold text-white">Global Chat</h2><div id="connectionStatus" class="text-sm"><span class="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2"></span><span class="text-gray-400">Connecting...</span></div></div>';
  card.appendChild(header);

  const chatContainer = document.createElement('div');
  chatContainer.className = 'flex flex-col h-[calc(100vh-280px)]';

  const messagesContainer = document.createElement('div');
  messagesContainer.id = 'messagesContainer';
  messagesContainer.className = 'flex-1 overflow-y-auto p-4 space-y-2';
  chatContainer.appendChild(messagesContainer);

  const typingContainer = document.createElement('div');
  typingContainer.id = 'typingContainer';
  typingContainer.className = 'px-4 py-2 hidden';
  chatContainer.appendChild(typingContainer);

  const inputContainer = document.createElement('div');
  inputContainer.className = 'border-t border-gray-700 p-4';
  chatContainer.appendChild(inputContainer);

  card.appendChild(chatContainer);
  maxWidth.appendChild(card);
  main.appendChild(maxWidth);
  container.appendChild(main);

  function initWebSocket() {
    try {
      ws = chatService.connectToGlobalChat();

      ws.onMessage((message: ChatWSMessage) => handleWebSocketMessage(message));
      ws.onStateChange((state) => {
        switch (state) {
          case WebSocketState.CONNECTED:
            updateConnectionStatus('connected');
            chatService.requestGlobalChatHistory();
            break;
          case WebSocketState.CONNECTING:
            updateConnectionStatus('connecting');
            break;
          case WebSocketState.RECONNECTING:
            updateConnectionStatus('reconnecting');
            break;
          case WebSocketState.DISCONNECTED:
          case WebSocketState.FAILED:
            updateConnectionStatus('disconnected');
            break;
        }
      });
      ws.onError((error) => {
        console.error('WebSocket error:', error);
        showError('Connection error');
      });

      if (ws.isConnected()) {
        updateConnectionStatus('connected');
        chatService.requestGlobalChatHistory();
      } else {
        ws.connect();
      }
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      showError('Failed to connect to chat');
    }
  }

  function handleWebSocketMessage(message: ChatWSMessage) {
    console.log('Received WebSocket message:', message);
    switch (message.type) {
      case 'HISTORY':
        console.log('Received HISTORY with', message.messages?.length, 'messages');
        if (message.messages && Array.isArray(message.messages)) {
          message.messages.forEach(async (msg) => {
            const avatar = await getUserAvatar(msg.userId);
            addMessage({
              id: String(Date.now() + Math.random()),
              senderId: msg.userId,
              senderName: msg.displayName,
              senderAvatar: avatar,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              isOwn: msg.userId === currentUserId,
              type: 'text',
              isRead: true,
            });
          });
        }
        break;
      case 'CHAT_MESSAGE':
        (async () => {
          const avatar = await getUserAvatar(message.userId);
          addMessage({
            id: String(Date.now()),
            senderId: message.userId,
            senderName: message.displayName,
            senderAvatar: avatar,
            content: message.content,
            timestamp: new Date(message.timestamp),
            isOwn: message.userId === currentUserId,
            type: 'text',
            isRead: true,
          });
        })();
        break;
      case 'USER_JOINED':
        addSystemMessage(message.displayName + ' joined the chat');
        break;
      case 'USER_LEFT':
        addSystemMessage(message.displayName + ' left the chat');
        break;
      case 'ERROR':
        showError(message.message || 'An error occurred');
        break;
    }
  }

  function addMessage(message: ChatMessageData) {
    messages.push(message);
    renderMessages();
    scrollToBottom();
  }

  function addSystemMessage(content: string) {
    addMessage({
      id: String(Date.now()),
      senderId: 0,
      senderName: 'System',
      senderAvatar: undefined,
      content,
      timestamp: new Date(),
      isOwn: false,
      type: 'system',
      isRead: true,
    });
  }

  function renderMessages() {
    messagesContainer.innerHTML = '';
    const groups = groupMessages(messages);
    groups.forEach((group) => {
      const groupEl = renderMessageGroup(group);
      messagesContainer.appendChild(groupEl);
    });
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 0);
  }

  function updateConnectionStatus(status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected') {
    const statusEl = header.querySelector('#connectionStatus');
    if (!statusEl) return;

    switch (status) {
      case 'connected':
        statusEl.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span><span class="text-gray-400">Connected</span>';
        break;
      case 'connecting':
        statusEl.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2"></span><span class="text-gray-400">Connecting...</span>';
        break;
      case 'reconnecting':
        statusEl.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-orange-500 mr-2"></span><span class="text-gray-400">Reconnecting...</span>';
        break;
      case 'disconnected':
        statusEl.innerHTML = '<span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span><span class="text-gray-400">Disconnected</span>';
        break;
    }
  }

  function sendMessage(content: string) {
    if (!content.trim()) return;
    try {
      chatService.sendGlobalChatMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
      showError('Failed to send message');
    }
  }

  function sendTypingStatus(isTyping: boolean) {
    console.log('Typing:', isTyping);
  }

  const chatInput = ChatInput({
    onSend: sendMessage,
    onTyping: sendTypingStatus,
  });
  inputContainer.appendChild(chatInput);

  initWebSocket();

  async function getUserAvatar(userId: number): Promise<string | undefined> {
    if (userAvatarCache.has(userId)) {
      return userAvatarCache.get(userId);
    }

    try {
      const user = await userService.getUserById(userId);
      const avatar = user.profilePicture;
      userAvatarCache.set(userId, avatar);
      return avatar;
    } catch (error) {
      console.error(`Failed to fetch avatar for user ${userId}:`, error);
      userAvatarCache.set(userId, undefined);
      return undefined;
    }
  }

  return container;
}
