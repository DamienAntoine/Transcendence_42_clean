

import { createElement, addClass, removeClass } from '@/utils/dom';


export type NotificationType = 'success' | 'error' | 'warning' | 'info';


export interface NotificationOptions {
  message: string;
  type?: NotificationType;
  duration?: number; 
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  closable?: boolean;
}


export class Notification {
  private element: HTMLElement;
  private container: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private options: Required<NotificationOptions>;

  constructor(options: NotificationOptions) {
    this.options = {
      type: 'info',
      duration: 5000,
      position: 'top-right',
      closable: true,
      ...options,
    };

    this.container = this.getOrCreateContainer();
    this.element = this.createNotification();
    this.show();
  }

  
  private getOrCreateContainer(): HTMLElement {
    const containerId = `notification-container-${this.options.position}`;
    let container = document.getElementById(containerId);

    if (!container) {
      container = this.createContainer();
      document.body.appendChild(container);
    }

    return container;
  }

  
  private createContainer(): HTMLElement {
    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    };

    return createElement('div', {
      id: `notification-container-${this.options.position}`,
      className: `fixed ${positionClasses[this.options.position]} z-50 space-y-2`,
    });
  }

  
  private createNotification(): HTMLElement {
    const typeConfig = {
      success: { bg: 'bg-green-600', icon: '✓', iconBg: 'bg-green-700' },
      error: { bg: 'bg-red-600', icon: '✕', iconBg: 'bg-red-700' },
      warning: { bg: 'bg-yellow-600', icon: '⚠', iconBg: 'bg-yellow-700' },
      info: { bg: 'bg-blue-600', icon: 'ℹ', iconBg: 'bg-blue-700' },
    };

    const config = typeConfig[this.options.type];

    const notification = createElement('div', {
      className: `${config.bg} text-white rounded-lg shadow-lg overflow-hidden transform translate-x-full transition-transform duration-300 min-w-[300px] max-w-md`,
    });

    const content = createElement('div', {
      className: 'flex items-center p-4',
    });

    
    const iconWrapper = createElement('div', {
      className: `${config.iconBg} rounded-full w-10 h-10 flex items-center justify-center mr-3 flex-shrink-0`,
    });

    const icon = createElement('span', {
      className: 'text-xl font-bold',
      textContent: config.icon,
    });

    iconWrapper.appendChild(icon);
    content.appendChild(iconWrapper);

    
    const message = createElement('div', {
      className: 'flex-1 text-sm',
      textContent: this.options.message,
    });

    content.appendChild(message);

    
    if (this.options.closable) {
      const closeBtn = createElement('button', {
        className: 'ml-3 text-white hover:text-gray-200 transition flex-shrink-0',
        innerHTML: '&times;',
        attributes: { 'aria-label': 'Close' },
      });
      closeBtn.style.fontSize = '1.5rem';
      closeBtn.addEventListener('click', () => this.close());
      content.appendChild(closeBtn);
    }

    notification.appendChild(content);

    
    if (this.options.duration > 0) {
      const progressBar = createElement('div', {
        className: 'h-1 bg-white bg-opacity-30',
      });

      const progress = createElement('div', {
        className: 'h-full bg-white transition-all',
      });
      progress.style.width = '100%';
      progress.style.transitionDuration = `${this.options.duration}ms`;

      progressBar.appendChild(progress);
      notification.appendChild(progressBar);

      
      setTimeout(() => {
        progress.style.width = '0%';
      }, 10);
    }

    return notification;
  }

  
  private show(): void {
    this.container.appendChild(this.element);

    
    this.element.offsetHeight;

    
    removeClass(this.element, 'translate-x-full');
    addClass(this.element, 'translate-x-0');

    
    if (this.options.duration > 0) {
      this.timer = setTimeout(() => {
        this.close();
      }, this.options.duration);
    }
  }

  
  close(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    
    addClass(this.element, 'translate-x-full');
    removeClass(this.element, 'translate-x-0');

    
    setTimeout(() => {
      if (this.element.parentNode) {
        this.container.removeChild(this.element);
      }

      
      if (this.container.children.length === 0 && this.container.parentNode) {
        document.body.removeChild(this.container);
      }
    }, 300);
  }
}


export function showNotification(message: string, type: NotificationType = 'info', duration?: number): Notification {
  const options: NotificationOptions = { message, type };
  if (duration !== undefined) {
    options.duration = duration;
  }
  return new Notification(options);
}

export function showSuccess(message: string, duration?: number): Notification {
  return showNotification(message, 'success', duration);
}

export function showError(message: string, duration?: number): Notification {
  return showNotification(message, 'error', duration);
}

export function showWarning(message: string, duration?: number): Notification {
  return showNotification(message, 'warning', duration);
}

export function showInfo(message: string, duration?: number): Notification {
  return showNotification(message, 'info', duration);
}
