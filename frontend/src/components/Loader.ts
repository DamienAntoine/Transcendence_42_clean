import { createElement } from '@/utils/dom';

export interface LoaderOptions {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
  text?: string;
  fullscreen?: boolean;
}

export function Loader(options: LoaderOptions = {}): HTMLElement {
  const { size = 'md', color = 'primary', text, fullscreen = false } = options;

  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  const colorClasses = {
    primary: 'border-primary-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-600 border-t-transparent',
  };

  const container = createElement('div', {
    className: `flex flex-col items-center justify-center gap-3 ${
      fullscreen ? 'fixed inset-0 bg-gray-900 bg-opacity-75 z-50' : ''
    }`,
  });

  const spinner = createElement('div', {
    className: `${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin`,
  });

  container.appendChild(spinner);

  if (text) {
    const textElement = createElement('p', {
      className: 'text-gray-300 text-sm',
      textContent: text,
    });
    container.appendChild(textElement);
  }

  return container;
}

export function LoaderDots(text: string = 'Chargement'): HTMLElement {
  const container = createElement('div', {
    className: 'flex items-center gap-2 text-gray-300',
  });

  const textElement = createElement('span', {
    textContent: text,
  });

  const dotsContainer = createElement('span', {
    className: 'inline-flex gap-1',
  });

  for (let i = 0; i < 3; i++) {
    const dot = createElement('span', {
      className: 'w-1 h-1 bg-gray-300 rounded-full animate-pulse',
    });
    dot.style.animationDelay = `${i * 200}ms`;
    dotsContainer.appendChild(dot);
  }

  container.appendChild(textElement);
  container.appendChild(dotsContainer);

  return container;
}

export function ProgressBar(progress: number, options: { label?: string; showPercentage?: boolean } = {}): HTMLElement {
  const { label, showPercentage = true } = options;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const container = createElement('div', {
    className: 'w-full',
  });

  if (label || showPercentage) {
    const header = createElement('div', {
      className: 'flex justify-between items-center mb-2',
    });

    if (label) {
      const labelElement = createElement('span', {
        className: 'text-sm text-gray-300',
        textContent: label,
      });
      header.appendChild(labelElement);
    }

    if (showPercentage) {
      const percentage = createElement('span', {
        className: 'text-sm text-gray-400',
        textContent: `${clampedProgress.toFixed(0)}%`,
      });
      header.appendChild(percentage);
    }

    container.appendChild(header);
  }

  const track = createElement('div', {
    className: 'w-full h-2 bg-gray-700 rounded-full overflow-hidden',
  });

  const fill = createElement('div', {
    className: 'h-full bg-primary-600 transition-all duration-300 rounded-full',
  });
  fill.style.width = `${clampedProgress}%`;

  track.appendChild(fill);
  container.appendChild(track);

  return container;
}

export function Skeleton(options: { width?: string; height?: string; className?: string } = {}): HTMLElement {
  const { width = '100%', height = '1rem', className = '' } = options;

  const skeleton = createElement('div', {
    className: `bg-gray-700 rounded animate-pulse ${className}`,
  });

  skeleton.style.width = width;
  skeleton.style.height = height;

  return skeleton;
}

export function SkeletonUserCard(): HTMLElement {
  const card = createElement('div', {
    className: 'bg-gray-800 rounded-lg shadow-lg overflow-hidden',
  });

  const header = createElement('div', {
    className: 'h-32 bg-gray-700 animate-pulse',
  });
  card.appendChild(header);

  const body = createElement('div', {
    className: 'p-4',
  });

  const avatarWrapper = createElement('div', {
    className: 'flex justify-center -mt-12 mb-4',
  });
  const avatar = createElement('div', {
    className: 'w-24 h-24 rounded-full bg-gray-700 animate-pulse border-4 border-gray-800',
  });
  avatarWrapper.appendChild(avatar);
  body.appendChild(avatarWrapper);

  
  const name = Skeleton({ width: '60%', height: '1.5rem', className: 'mx-auto mb-2' });
  body.appendChild(name);

  
  const username = Skeleton({ width: '40%', height: '1rem', className: 'mx-auto mb-4' });
  body.appendChild(username);

  
  const stats = createElement('div', {
    className: 'grid grid-cols-3 gap-4 pt-4 border-t border-gray-700',
  });

  for (let i = 0; i < 3; i++) {
    const stat = createElement('div', {
      className: 'text-center',
    });
    const value = Skeleton({ width: '3rem', height: '2rem', className: 'mx-auto mb-2' });
    const label = Skeleton({ width: '4rem', height: '0.75rem', className: 'mx-auto' });
    stat.appendChild(value);
    stat.appendChild(label);
    stats.appendChild(stat);
  }

  body.appendChild(stats);
  card.appendChild(body);

  return card;
}

export function showLoader(text?: string): HTMLElement {
  const loader = Loader({ size: 'xl', fullscreen: true, text });
  document.body.appendChild(loader);
  return loader;
}

export function hideLoader(loader: HTMLElement): void {
  if (loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
}

export async function withLoader<T>(
  fn: () => Promise<T>,
  text?: string
): Promise<T> {
  const loader = showLoader(text);
  try {
    return await fn();
  } finally {
    hideLoader(loader);
  }
}
