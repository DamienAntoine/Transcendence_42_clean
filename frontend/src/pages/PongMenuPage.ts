import { createElement } from '@/utils/dom';
import { Navbar } from '@/components/Navbar';
import { router } from '@/router';

export function PongMenuPage(): HTMLElement {
  const container = createElement('div', {
    className: 'min-h-screen bg-gray-900',
  });

  const navbar = Navbar();
  container.appendChild(navbar);

  const main = createElement('main', {
    className: 'pt-20 px-4 pb-12',
  });

  const maxWidth = createElement('div', {
    className: 'max-w-4xl mx-auto',
  });

  const header = createElement('div', {
    className: 'text-center mb-12',
  });

  const icon = createElement('div', {
    className: 'text-9xl mb-6',
    textContent: '🏓',
  });

  const title = createElement('h1', {
    className: 'text-5xl font-bold text-white mb-4',
    textContent: 'PONG',
  });

  const subtitle = createElement('p', {
    className: 'text-xl text-gray-400',
    textContent: 'Choose your game mode',
  });

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(subtitle);
  maxWidth.appendChild(header);

  const menu = createMenuOptions();
  maxWidth.appendChild(menu);

  main.appendChild(maxWidth);
  container.appendChild(main);

  return container;
}

function createMenuOptions(): HTMLElement {
  const grid = createElement('div', {
    className: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  });

  const options = [
    {
      title: 'Matchmaking',
      description: 'Find an opponent and play online',
      icon: '🎯',
      color: 'bg-primary-600 hover:bg-primary-700',
      route: '/pong/matchmaking',
    },
    {
      title: 'Custom Match',
      description: 'Create a private game with a friend',
      icon: '👥',
      color: 'bg-blue-600 hover:bg-blue-700',
      route: '/pong/custom',
    },
    {
      title: 'Tournaments',
      description: 'Participate in competitive tournaments',
      icon: '🏆',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      route: '/tournaments',
    },
  ];

  options.forEach((option) => {
    const card = createElement('div', {
      className: `${option.color} rounded-lg p-8 cursor-pointer transition transform hover:scale-105 shadow-lg`,
    });

    card.addEventListener('click', () => {
      router.navigate(option.route);
    });

    const iconDiv = createElement('div', {
      className: 'text-6xl mb-4 text-center',
      textContent: option.icon,
    });

    const titleDiv = createElement('h3', {
      className: 'text-2xl font-bold text-white mb-2 text-center',
      textContent: option.title,
    });

    const descDiv = createElement('p', {
      className: 'text-gray-200 text-center',
      textContent: option.description,
    });

    card.appendChild(iconDiv);
    card.appendChild(titleDiv);
    card.appendChild(descDiv);
    grid.appendChild(card);
  });

  return grid;
}
