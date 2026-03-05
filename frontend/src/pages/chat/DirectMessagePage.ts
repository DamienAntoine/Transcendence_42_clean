

import { Navbar } from '@/components/Navbar';
import { chatService } from '@/services/ChatService';
import { ChatMessageData, groupMessages, renderMessageGroup } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatRoomList, ChatRoomData } from './ChatRoomList';
import { showError, showSuccess } from '@/components/Notification';
import { getUser } from '@/utils/storage';
import type { DmWSMessage, DmMessage, FriendsList, FriendStatus } from '@/types';
import type { WebSocketManager } from '@/services/WebSocketManager';


export function DirectMessagePage(): HTMLElement {

  let friends: FriendsList | null = null;
  const wsConnections: Map<number, WebSocketManager<DmWSMessage>> = new Map();
  const conversations: Map<number, ChatMessageData[]> = new Map();
  let currentPeerId: number | null = null;
  let currentUserId: number = 0;


  const user = getUser();
  if (user) {
    currentUserId = user.id;
  }


  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gray-900';


  const navbar = Navbar();
  container.appendChild(navbar);


  const main = document.createElement('main');
  main.className = 'pt-20 h-screen flex flex-col';

  const contentContainer = document.createElement('div');
  contentContainer.className = 'flex-1 flex overflow-hidden';


  const sidebar = document.createElement('div');
  sidebar.className = 'w-80 bg-gray-800 border-r border-gray-700 flex flex-col';
  sidebar.id = 'dmSidebar';


  const sidebarHeader = document.createElement('div');
  sidebarHeader.className = 'p-4 border-b border-gray-700';
  sidebarHeader.innerHTML = `
    <h2 class="text-xl font-bold text-white mb-1">💬 Direct Messages</h2>
    <p class="text-sm text-gray-400">Chat with your friends</p>
  `;
  sidebar.appendChild(sidebarHeader);


  const roomListContainer = document.createElement('div');
  roomListContainer.className = 'flex-1 overflow-y-auto';
  roomListContainer.id = 'roomListContainer';
  sidebar.appendChild(roomListContainer);

  contentContainer.appendChild(sidebar);


  const chatArea = document.createElement('div');
  chatArea.className = 'flex-1 flex flex-col bg-gray-900';
  chatArea.id = 'chatArea';


  const emptyState = createEmptyState();
  chatArea.appendChild(emptyState);

  contentContainer.appendChild(chatArea);
  main.appendChild(contentContainer);
  container.appendChild(main);


  loadFriends();


  window.addEventListener('beforeunload', () => {
    wsConnections.forEach((_ws, peerId) => {
      chatService.disconnectFromDm(peerId);
    });
  });


  async function loadFriends() {
    try {
      friends = await chatService.getFriendsList();


      const unreadCounts = await chatService.getUnreadCounts();
      const unreadMap = new Map(unreadCounts.map((u) => [u.peerId, u.unreadCount]));


      const statusList = await chatService.getFriendsStatus();
      const statusMap = new Map(statusList.map((s) => [s.userId, s.status === 'online']));


      const rooms: ChatRoomData[] = friends.friends.map((friend: FriendStatus) => ({
        id: String(friend.userId),
        name: friend.displayName,
        avatar: undefined,
        type: 'direct',
        isOnline: statusMap.get(friend.userId) || false,
        unreadCount: unreadMap.get(friend.userId) || 0,
        lastMessage: undefined,
        lastMessageTime: undefined,
      }));


      renderRoomList(rooms);
    } catch (error) {
      console.error('Failed to load friends:', error);
      showError('Failed to load friends list');
    }
  }


  function renderRoomList(rooms: ChatRoomData[]) {
    roomListContainer.innerHTML = '';

    const roomList = ChatRoomList({
      rooms,
      activeRoomId: currentPeerId ? String(currentPeerId) : undefined,
      onSelect: (roomId) => {
        const peerId = parseInt(roomId);
        selectConversation(peerId);
      },
      showSearch: true,
      emptyMessage: 'No friends yet. Add friends to start chatting!',
    });

    roomListContainer.appendChild(roomList);
  }


  async function selectConversation(peerId: number) {
    currentPeerId = peerId;


    updateRoomListActiveState();


    if (!conversations.has(peerId)) {
      await loadConversation(peerId);
    }


    if (!wsConnections.has(peerId)) {
      connectToDm(peerId);
    }


    renderConversation(peerId);
  }


  async function loadConversation(peerId: number) {
    try {
      const messages = await chatService.getDmMessages(peerId);

      const chatMessages: ChatMessageData[] = messages.map((msg: DmMessage) => ({
        id: String(msg.id),
        senderId: msg.senderId,
        senderName: msg.senderDisplayName,
        senderAvatar: undefined,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        isRead: false,
        isOwn: msg.senderId === currentUserId,
        type: 'text',
      }));

      conversations.set(peerId, chatMessages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      showError('Failed to load conversation');
      conversations.set(peerId, []);
    }
  }


  function connectToDm(peerId: number) {
    try {
      const ws = chatService.connectToDm(peerId);
      wsConnections.set(peerId, ws);


      ws.onMessage((message: DmWSMessage) => {
        handleDmMessage(peerId, message);
      });

      ws.onError((error) => {
        console.error(`DM WebSocket error for peer ${peerId}:`, error);
      });

      ws.connect();

    } catch (error) {
      console.error('Failed to connect to DM:', error);
      showError('Failed to connect to chat');
    }
  }


  function handleDmMessage(peerId: number, message: DmWSMessage) {
    if (message.type === 'DM_MESSAGE') {
      const msg = message.message;
      const newMessage: ChatMessageData = {
        id: String(msg.id),
        senderId: msg.senderId,
        senderName: msg.senderDisplayName,
        senderAvatar: undefined,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        isOwn: msg.senderId === currentUserId,
        type: 'text',
        isRead: false,
      };


      const conv = conversations.get(peerId) || [];
      conv.push(newMessage);
      conversations.set(peerId, conv);


      if (currentPeerId === peerId) {
        renderMessages(peerId);
        scrollToBottom();


        if (!newMessage.isOwn) {
          chatService.markDmAsRead(peerId, parseInt(newMessage.id));
        }
      }


      updateRoomInList(peerId, {
        lastMessage: newMessage.content,
        lastMessageTime: newMessage.timestamp,
        unreadCount: newMessage.isOwn ? 0 : (currentPeerId !== peerId ? 1 : 0),
      });
    } else if (message.type === 'READ_RECEIPT') {

      const conv = conversations.get(peerId);
      if (conv) {
        conv.forEach((msg) => {
          if (parseInt(msg.id) <= message.lastReadId && msg.isOwn) {
            msg.isRead = true;
          }
        });

        if (currentPeerId === peerId) {
          renderMessages(peerId);
        }
      }
    } else if (message.type === 'HISTORY') {

      const chatMessages: ChatMessageData[] = message.messages.map((msg: DmMessage) => ({
        id: String(msg.id),
        senderId: msg.senderId,
        senderName: msg.senderDisplayName,
        senderAvatar: undefined,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        isRead: parseInt(String(msg.id)) <= message.lastReadId,
        isOwn: msg.senderId === currentUserId,
        type: 'text',
      }));

      conversations.set(peerId, chatMessages);

      if (currentPeerId === peerId) {
        renderMessages(peerId);
      }
    } else if (message.type === 'ERROR') {
      showError(message.message || 'An error occurred');
    }
  }


  function renderConversation(peerId: number) {
    const friend = friends?.friends.find((f: FriendStatus) => f.userId === peerId);
    if (!friend) return;

    chatArea.innerHTML = '';


    const header = document.createElement('div');
    header.className = 'bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between';
    header.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
          <span class="text-sm font-semibold text-white">${friend.displayName.substring(0, 2).toUpperCase()}</span>
        </div>
        <div>
          <h3 class="text-white font-semibold">${friend.displayName}</h3>
          <p class="text-xs text-gray-400">${friend.online ? 'Online' : 'Offline'}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button id="blockUserBtn" class="text-gray-400 hover:text-red-400 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </button>
      </div>
    `;
    chatArea.appendChild(header);


    const messagesArea = document.createElement('div');
    messagesArea.id = 'dmMessagesArea';
    messagesArea.className = 'flex-1 overflow-y-auto p-4 space-y-4';
    chatArea.appendChild(messagesArea);


    const typingContainer = document.createElement('div');
    typingContainer.id = 'typingIndicator';
    typingContainer.className = 'hidden';
    chatArea.appendChild(typingContainer);


    const inputContainer = document.createElement('div');
    const chatInput = ChatInput({
      placeholder: `Message ${friend.displayName}...`,
      maxLength: 2000,
      allowFiles: true,
      allowEmojis: true,
      onSend: (content, type, file) => {
        if (type === 'text') {
          sendMessage(peerId, content);
        } else if (type === 'file' && file) {

          showError('File upload not yet implemented');
        }
      },
      onTyping: (_isTyping) => {

      },
    });
    inputContainer.appendChild(chatInput);
    chatArea.appendChild(inputContainer);


    renderMessages(peerId);


    const blockBtn = header.querySelector('#blockUserBtn');
    if (blockBtn) {
      blockBtn.addEventListener('click', async () => {
        if (confirm(`Block ${friend.displayName}?`)) {
          try {
            await chatService.blockUser(peerId);
            showSuccess(`Blocked ${friend.displayName}`);
            loadFriends();
          } catch (error) {
            showError('Failed to block user');
          }
        }
      });
    }
  }


  function renderMessages(peerId: number) {
    const messagesArea = document.getElementById('dmMessagesArea');
    if (!messagesArea) return;

    const msgs = conversations.get(peerId) || [];
    messagesArea.innerHTML = '';

    if (msgs.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'flex items-center justify-center h-full';
      emptyMsg.innerHTML = `
        <p class="text-gray-400">No messages yet. Start the conversation!</p>
      `;
      messagesArea.appendChild(emptyMsg);
      return;
    }


    const groups = groupMessages(msgs);
    groups.forEach((group) => {
      const groupEl = renderMessageGroup(group, {
        showAvatar: true,
        showTimestamp: true,
        showReadStatus: true,
      });
      messagesArea.appendChild(groupEl);
    });

    scrollToBottom();
  }


  function sendMessage(peerId: number, content: string) {
    try {
      const success = chatService.sendDmMessage(peerId, content);
      if (!success) {
        showError('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message');
    }
  }


  function scrollToBottom() {
    setTimeout(() => {
      const messagesArea = document.getElementById('dmMessagesArea');
      if (messagesArea) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
      }
    }, 100);
  }


  function updateRoomListActiveState() {
    const roomItems = roomListContainer.querySelectorAll('[data-room-id]');
    roomItems.forEach((item) => {
      const roomId = item.getAttribute('data-room-id');
      if (roomId === String(currentPeerId)) {
        item.classList.add('bg-gray-700');
        item.classList.remove('hover:bg-gray-700/50');
      } else {
        item.classList.remove('bg-gray-700');
        item.classList.add('hover:bg-gray-700/50');
      }
    });
  }


  function updateRoomInList(_peerId: number, _updates: Partial<ChatRoomData>) {



  }


  function createEmptyState(): HTMLElement {
    const empty = document.createElement('div');
    empty.className = 'flex items-center justify-center h-full';
    empty.innerHTML = `
      <div class="text-center">
        <div class="text-6xl mb-4">💬</div>
        <p class="text-gray-400 mb-2">Select a conversation to start chatting</p>
        <p class="text-gray-500 text-sm">or add friends to start new conversations</p>
      </div>
    `;
    return empty;
  }

  return container;
}
