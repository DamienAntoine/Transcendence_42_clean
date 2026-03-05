

import { createElement, addClass, removeClass, addListener } from '@/utils/dom';


export interface ModalOptions {
  title?: string;
  content?: string | HTMLElement;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  actions?: ModalAction[];
  onClose?: () => void;
}


export interface ModalAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}


export class Modal {
  private overlay: HTMLElement;
  private modal: HTMLElement;
  private options: ModalOptions;
  private cleanupListeners: (() => void)[] = [];

  constructor(options: ModalOptions = {}) {
    this.options = {
      showCloseButton: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
      size: 'md',
      ...options,
    };

    this.overlay = this.createOverlay();
    this.modal = this.createModal();
    this.setupEventListeners();
  }

  
  private createOverlay(): HTMLElement {
    const overlay = createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 opacity-0 transition-opacity duration-300',
    });

    if (this.options.closeOnOverlayClick) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }

    return overlay;
  }

  
  private createModal(): HTMLElement {
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
    };

    const modal = createElement('div', {
      className: `bg-gray-800 rounded-lg shadow-xl ${sizeClasses[this.options.size || 'md']} w-full transform scale-95 transition-transform duration-300`,
    });

    
    if (this.options.title || this.options.showCloseButton) {
      const header = this.createHeader();
      modal.appendChild(header);
    }

    
    const body = this.createBody();
    modal.appendChild(body);

    
    if (this.options.actions && this.options.actions.length > 0) {
      const footer = this.createFooter();
      modal.appendChild(footer);
    }

    return modal;
  }

  
  private createHeader(): HTMLElement {
    const header = createElement('div', {
      className: 'flex items-center justify-between p-4 border-b border-gray-700',
    });

    if (this.options.title) {
      const title = createElement('h3', {
        className: 'text-xl font-semibold text-white',
        textContent: this.options.title,
      });
      header.appendChild(title);
    } else {
      header.appendChild(createElement('div')); 
    }

    if (this.options.showCloseButton) {
      const closeBtn = createElement('button', {
        className: 'text-gray-400 hover:text-white transition',
        innerHTML: '&times;',
        attributes: { 'aria-label': 'Close' },
      });
      closeBtn.style.fontSize = '2rem';
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    }

    return header;
  }

  
  private createBody(): HTMLElement {
    const body = createElement('div', {
      className: 'p-6 text-gray-300',
    });

    if (this.options.content) {
      if (typeof this.options.content === 'string') {
        body.innerHTML = this.options.content;
      } else {
        body.appendChild(this.options.content);
      }
    }

    return body;
  }

  
  private createFooter(): HTMLElement {
    const footer = createElement('div', {
      className: 'flex items-center justify-end space-x-3 p-4 border-t border-gray-700',
    });

    this.options.actions?.forEach((action) => {
      const btn = this.createActionButton(action);
      footer.appendChild(btn);
    });

    return footer;
  }

  
  private createActionButton(action: ModalAction): HTMLElement {
    const variantClasses = {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    const btn = createElement('button', {
      className: `px-4 py-2 rounded-md font-medium transition ${variantClasses[action.variant || 'secondary']} ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
      textContent: action.label,
    });

    if (action.disabled) {
      btn.setAttribute('disabled', 'true');
    }

    btn.addEventListener('click', async () => {
      if (action.disabled) return;
      try {
        await action.onClick();
      } catch (error) {
        console.error('Error in modal action:', error);
      }
    });

    return btn;
  }

  
  private setupEventListeners(): void {
    if (this.options.closeOnEscape) {
      const cleanup = addListener(document.body, 'keydown', (e) => {
        if (e.key === 'Escape') {
          this.close();
        }
      });
      this.cleanupListeners.push(cleanup);
    }
  }

  
  open(): void {
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    
    this.overlay.offsetHeight;

    
    removeClass(this.overlay, 'opacity-0');
    addClass(this.overlay, 'opacity-100');
    removeClass(this.modal, 'scale-95');
    addClass(this.modal, 'scale-100');

    
    document.body.style.overflow = 'hidden';
  }

  
  close(): void {
    
    addClass(this.overlay, 'opacity-0');
    removeClass(this.overlay, 'opacity-100');
    addClass(this.modal, 'scale-95');
    removeClass(this.modal, 'scale-100');

    
    setTimeout(() => {
      if (this.overlay.parentNode) {
        document.body.removeChild(this.overlay);
      }
      document.body.style.overflow = '';

      if (this.options.onClose) {
        this.options.onClose();
      }
    }, 300);
  }

  
  updateContent(content: string | HTMLElement): void {
    const body = this.modal.querySelector('.p-6');
    if (body) {
      body.innerHTML = '';
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else {
        body.appendChild(content);
      }
    }
  }

  
  destroy(): void {
    this.close();
    this.cleanupListeners.forEach((cleanup) => cleanup());
    this.cleanupListeners = [];
  }
}


export function showModal(options: ModalOptions): Modal {
  const modal = new Modal(options);
  modal.open();
  return modal;
}


export function showConfirmModal(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>
): Modal {
  return showModal({
    title,
    content: message,
    size: 'sm',
    actions: [
      {
        label: 'Cancel',
        variant: 'secondary',
        onClick: () => {},
      },
      {
        label: 'Confirm',
        variant: 'primary',
        onClick: onConfirm,
      },
    ],
  });
}
