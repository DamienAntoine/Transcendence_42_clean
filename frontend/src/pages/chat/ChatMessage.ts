


function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}


function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}


export interface ChatMessageData {
  id: string;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date | string;
  isRead?: boolean;
  isOwn?: boolean;
  type?: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
}


export interface ChatMessageOptions {
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showReadStatus?: boolean;
  compact?: boolean;
}


export function ChatMessage(
  message: ChatMessageData,
  options: ChatMessageOptions = {}
): HTMLElement {
  const {
    showAvatar = true,
    showTimestamp = true,
    showReadStatus = true,
    compact = false,
  } = options;


  const container = document.createElement('div');
  container.className = `flex gap-3 ${compact ? 'py-1' : 'py-3'} ${
    message.isOwn ? 'flex-row-reverse' : 'flex-row'
  }`;


  if (showAvatar && message.type !== 'system') {
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'flex-shrink-0 cursor-pointer';

    avatarContainer.addEventListener('click', () => {
      if (message.senderId) {
        window.location.href = `/profile/${message.senderId}`;
      }
    });

    const avatar = document.createElement('div');
    avatar.className = 'w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center hover:ring-2 hover:ring-primary-500 transition';

    if (message.senderAvatar) {
      avatar.innerHTML = `<img src="${message.senderAvatar}" alt="${message.senderName || 'User'}" class="w-full h-full object-cover" />`;
    } else {

      const displayName = message.senderName || 'User';
      const initials = displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      avatar.innerHTML = `<span class="text-sm font-semibold text-white">${initials}</span>`;
    }

    avatarContainer.appendChild(avatar);
    container.appendChild(avatarContainer);
  }


  const contentArea = document.createElement('div');
  contentArea.className = `flex-1 max-w-2xl ${message.isOwn ? 'flex flex-col items-end' : ''}`;


  if (message.type === 'system') {
    container.className = 'flex justify-center py-2';
    contentArea.className = 'text-center';
    contentArea.innerHTML = `
      <div class="text-xs text-gray-400 bg-gray-800/50 rounded-full px-4 py-1">
        ${escapeHtml(message.content)}
      </div>
    `;
    container.appendChild(contentArea);
    return container;
  }


  if (!message.isOwn) {
    const senderName = document.createElement('div');
    senderName.className = 'text-sm font-semibold text-gray-300 mb-1';
    senderName.textContent = message.senderName;
    contentArea.appendChild(senderName);
  }


  const bubble = document.createElement('div');
  bubble.className = `rounded-2xl px-4 py-2 inline-block ${
    message.isOwn
      ? 'bg-purple-600 text-white rounded-br-sm'
      : 'bg-gray-700 text-gray-100 rounded-bl-sm'
  }`;


  if (message.type === 'text' || !message.type) {
    const textContent = document.createElement('div');
    textContent.className = 'text-sm whitespace-pre-wrap break-words';
    textContent.textContent = message.content;
    bubble.appendChild(textContent);
  } else if (message.type === 'image') {
    const img = document.createElement('img');
    img.src = message.fileUrl || '';
    img.alt = message.content;
    img.className = 'max-w-sm max-h-96 rounded-lg';
    bubble.appendChild(img);

    if (message.content) {
      const caption = document.createElement('div');
      caption.className = 'text-sm mt-2';
      caption.textContent = message.content;
      bubble.appendChild(caption);
    }
  } else if (message.type === 'file') {
    const fileContainer = document.createElement('div');
    fileContainer.className = 'flex items-center gap-3';

    fileContainer.innerHTML = `
      <div class="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">${escapeHtml(message.fileName || 'File')}</div>
        <div class="text-xs text-gray-400">Click to download</div>
      </div>
    `;

    if (message.fileUrl) {
      const link = document.createElement('a');
      link.href = message.fileUrl;
      link.download = message.fileName || 'file';
      link.target = '_blank';
      link.className = 'block';
      link.appendChild(fileContainer);
      bubble.appendChild(link);
    } else {
      bubble.appendChild(fileContainer);
    }
  }

  contentArea.appendChild(bubble);


  if (showTimestamp || (showReadStatus && message.isOwn)) {
    const footer = document.createElement('div');
    footer.className = `flex items-center gap-2 mt-1 px-2 text-xs text-gray-400 ${
      message.isOwn ? 'justify-end' : ''
    }`;

    if (showTimestamp) {
      const timestamp = document.createElement('span');
      const date = typeof message.timestamp === 'string'
        ? new Date(message.timestamp)
        : message.timestamp;
      timestamp.textContent = formatDistanceToNow(date);
      footer.appendChild(timestamp);
    }

    if (showReadStatus && message.isOwn) {
      const readStatus = document.createElement('span');
      readStatus.innerHTML = message.isRead
        ? `<svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
           </svg>`
        : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
           </svg>`;
      footer.appendChild(readStatus);
    }

    contentArea.appendChild(footer);
  }

  container.appendChild(contentArea);

  return container;
}


function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


export function groupMessages(messages: ChatMessageData[]): ChatMessageData[][] {
  const groups: ChatMessageData[][] = [];
  let currentGroup: ChatMessageData[] = [];
  let lastSenderId: number | null = null;

  messages.forEach((message) => {
    if (message.type === 'system') {

      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      groups.push([message]);
      lastSenderId = null;
    } else if (message.senderId === lastSenderId) {

      currentGroup.push(message);
    } else {

      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [message];
      lastSenderId = message.senderId;
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}


export function renderMessageGroup(
  messages: ChatMessageData[],
  options: ChatMessageOptions = {}
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'space-y-1 mb-4';


  if (messages.length > 0 && messages[0].type !== 'system') {
    const firstMessage = messages[0];
    const date = typeof firstMessage.timestamp === 'string'
      ? new Date(firstMessage.timestamp)
      : firstMessage.timestamp;

    const timeHeader = document.createElement('div');
    timeHeader.className = `text-xs text-gray-500 mb-2 ${firstMessage.isOwn ? 'text-right' : 'text-left'}`;
    timeHeader.textContent = formatTime(date);
    container.appendChild(timeHeader);
  }

  messages.forEach((message, index) => {
    const isFirst = index === 0;
    const isLast = index === messages.length - 1;

    const messageEl = ChatMessage(message, {
      ...options,
      showAvatar: isLast,
      showTimestamp: false,
      compact: !isFirst && !isLast,
    });

    container.appendChild(messageEl);
  });

  return container;
}
