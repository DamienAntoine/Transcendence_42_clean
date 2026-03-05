

import { createElement } from '@/utils/dom';

export interface AvatarProps {
  displayName: string;
  src?: string | null;
  className?: string; 
  title?: string;
}


export function Avatar(props: AvatarProps): HTMLElement {
  const { displayName, src, className = 'w-10 h-10', title } = props;

  const wrapper = createElement('div', {
    className: `relative ${className} rounded-full overflow-hidden bg-primary-600 flex items-center justify-center text-white font-bold`,
  });

  if (title) (wrapper as HTMLElement).setAttribute('title', title);

  const renderInitial = () => {
    wrapper.innerHTML = '';
    const span = createElement('span', {
      className: 'select-none',
      textContent: (displayName || '?').charAt(0).toUpperCase(),
    });
    wrapper.appendChild(span);
  };

  if (src && typeof src === 'string' && src.trim().length > 0) {
    const img = createElement('img', {
      className: 'w-full h-full object-cover',
      attributes: { src, alt: displayName || 'avatar' },
    }) as HTMLImageElement;
    img.onerror = () => {
      
      renderInitial();
    };
    wrapper.appendChild(img);
  } else {
    renderInitial();
  }

  return wrapper;
}
