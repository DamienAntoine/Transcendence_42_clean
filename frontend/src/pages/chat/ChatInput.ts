


export type SendMessageCallback = (content: string, type: 'text' | 'file', file?: File) => void;


export type TypingCallback = (isTyping: boolean) => void;


export interface ChatInputOptions {
  placeholder?: string;
  onSend: SendMessageCallback;
  onTyping?: TypingCallback;
  maxLength?: number;
  allowFiles?: boolean;
  allowEmojis?: boolean;
}


const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
  '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
  '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
  '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒', '😞',
  '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫',
  '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👊',
  '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
  '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
];


export function ChatInput(options: ChatInputOptions): HTMLElement {
  const {
    placeholder = 'Type a message...',
    onSend,
    onTyping,
    maxLength = 2000,
    allowFiles = true,
    allowEmojis = true,
  } = options;

  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  let isEmojiPickerOpen = false;

  
  const container = document.createElement('div');
  container.className = 'bg-gray-800 border-t border-gray-700 p-4';

  
  const inputContainer = document.createElement('div');
  inputContainer.className = 'flex items-end gap-2';

  
  if (allowFiles) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'chatFileInput';
    fileInput.className = 'hidden';
    fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        onSend(file.name, 'file', file);
        fileInput.value = ''; 
      }
    });

    const fileButton = document.createElement('button');
    fileButton.type = 'button';
    fileButton.className = 'flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors';
    fileButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    `;
    fileButton.addEventListener('click', () => {
      fileInput.click();
    });

    container.appendChild(fileInput);
    inputContainer.appendChild(fileButton);
  }

  
  const textareaWrapper = document.createElement('div');
  textareaWrapper.className = 'flex-1 relative';

  const textarea = document.createElement('textarea');
  textarea.id = 'chatTextarea';
  textarea.rows = 1;
  textarea.placeholder = placeholder;
  textarea.maxLength = maxLength;
  textarea.className = 'w-full bg-gray-700 text-white rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 max-h-32 overflow-y-auto';

  
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';

    
    if (onTyping) {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      onTyping(true);
      typingTimeout = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  });

  
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  textareaWrapper.appendChild(textarea);

  
  if (allowEmojis) {
    const emojiButton = document.createElement('button');
    emojiButton.type = 'button';
    emojiButton.className = 'absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors';
    emojiButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;

    const emojiPicker = createEmojiPicker((emoji) => {
      textarea.value += emoji;
      textarea.focus();
      toggleEmojiPicker();
    });

    const toggleEmojiPicker = () => {
      isEmojiPickerOpen = !isEmojiPickerOpen;
      if (isEmojiPickerOpen) {
        emojiPicker.classList.remove('hidden');
      } else {
        emojiPicker.classList.add('hidden');
      }
    };

    emojiButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEmojiPicker();
    });

    
    document.addEventListener('click', (e) => {
      if (isEmojiPickerOpen && !emojiPicker.contains(e.target as Node) && e.target !== emojiButton) {
        toggleEmojiPicker();
      }
    });

    textareaWrapper.appendChild(emojiButton);
    textareaWrapper.appendChild(emojiPicker);
  }

  inputContainer.appendChild(textareaWrapper);

  
  const sendButton = document.createElement('button');
  sendButton.type = 'button';
  sendButton.className = 'flex-shrink-0 w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  sendButton.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  `;

  const handleSend = () => {
    const content = textarea.value.trim();
    if (content) {
      onSend(content, 'text');
      textarea.value = '';
      textarea.style.height = 'auto';

      if (onTyping) {
        onTyping(false);
      }
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    }
  };

  sendButton.addEventListener('click', handleSend);

  inputContainer.appendChild(sendButton);

  container.appendChild(inputContainer);

  
  const updateCharCounter = () => {
    const remaining = maxLength - textarea.value.length;
    const existingCounter = container.querySelector('.char-counter');

    if (remaining < 100) {
      if (!existingCounter) {
        const counter = document.createElement('div');
        counter.className = 'char-counter text-xs text-gray-400 text-right mt-1';
        counter.textContent = `${remaining} characters remaining`;
        container.appendChild(counter);
      } else {
        existingCounter.textContent = `${remaining} characters remaining`;
      }
    } else if (existingCounter) {
      existingCounter.remove();
    }
  };

  textarea.addEventListener('input', updateCharCounter);

  return container;
}


function createEmojiPicker(onSelect: (emoji: string) => void): HTMLElement {
  const picker = document.createElement('div');
  picker.className = 'hidden absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2 w-64 max-h-64 overflow-y-auto z-10';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-8 gap-1';

  COMMON_EMOJIS.forEach((emoji) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded text-xl transition-colors';
    button.textContent = emoji;
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(emoji);
    });
    grid.appendChild(button);
  });

  picker.appendChild(grid);
  return picker;
}


export function TypingIndicator(userNames: string[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'px-4 py-2 text-sm text-gray-400 flex items-center gap-2';

  const dots = document.createElement('div');
  dots.className = 'flex gap-1';
  dots.innerHTML = `
    <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
    <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
    <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
  `;

  const text = document.createElement('span');
  if (userNames.length === 1) {
    text.textContent = `${userNames[0]} is typing...`;
  } else if (userNames.length === 2) {
    text.textContent = `${userNames[0]} and ${userNames[1]} are typing...`;
  } else {
    text.textContent = `${userNames.length} people are typing...`;
  }

  container.appendChild(dots);
  container.appendChild(text);

  return container;
}
