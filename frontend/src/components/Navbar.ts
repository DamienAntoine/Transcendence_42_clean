import { createElement, addClass } from '@/utils/dom';
import { getUser, clearUserData } from '@/utils/storage';
import { router } from '@/router';
import { Avatar } from '@/components/Avatar';

export interface NavbarOptions {
  fixed?: boolean;
  showProfile?: boolean;
  onLogout?: () => void;
}

export function Navbar(options: NavbarOptions = {}): HTMLElement {
  const { fixed = true, showProfile = true, onLogout } = options;

  const nav = createElement('nav', {
    className: `bg-gray-800 border-b border-gray-700 ${fixed ? 'fixed top-0 left-0 right-0 z-50' : ''}`,
  });

  const container = createElement('div', {
    className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  });

  const innerContainer = createElement('div', {
    className: 'flex items-center justify-between h-16',
  });

  const logoSection = createLogoSection();
  innerContainer.appendChild(logoSection);

  const navLinks = createNavLinks();
  innerContainer.appendChild(navLinks);

  if (showProfile) {
    const profileSection = createProfileSection(onLogout);
    innerContainer.appendChild(profileSection);
  }

  container.appendChild(innerContainer);
  nav.appendChild(container);

  return nav;
}

function createLogoSection(): HTMLElement {
  const section = createElement('div', {
    className: 'flex items-center',
  });

  const logo = createElement('a', {
    className: 'flex items-center space-x-3',
    attributes: { href: '/', 'data-brand': 'true' },
  });

  const logoText = createElement('span', {
    className: 'text-2xl font-bold text-primary-500',
    textContent: 'Transcendence',
  });

  logo.appendChild(logoText);
  section.appendChild(logo);

  return section;
}

function createNavLinks(): HTMLElement {
  const nav = createElement('nav', {
    className: 'hidden md:flex items-center space-x-4',
  });

  const links = [
    { path: '/', label: 'Home' },
    { path: '/pong', label: 'Pong' },
    { path: '/tournaments', label: 'Tournaments' },
    { path: '/chat', label: 'Chat' },
    { path: '/friends', label: 'Friends' },
    { path: '/leaderboard', label: 'Leaderboard' },
  ];

  links.forEach(({ path, label }) => {
    const link = createElement('a', {
      className: 'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition',
      attributes: { href: path },
    });

    const labelSpan = createElement('span', { textContent: label });

    link.appendChild(labelSpan);

    if (router.getCurrentPath() === path) {
      addClass(link, 'bg-gray-700', 'text-white');
    }

    nav.appendChild(link);
  });

  return nav;
}

function createProfileSection(onLogout?: () => void): HTMLElement {
  const section = createElement('div', {
    className: 'flex items-center space-x-4',
  });

  const user = getUser();

  if (user) {
    const profileBtn = createElement('a', {
      className: 'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition',
      attributes: { href: '/profile' },
    });

    const avatar = Avatar({
      displayName: user.displayName,
      src: user.profilePicture,
      className: 'w-8 h-8'
    });

    const nameSpan = createElement('span', {
      textContent: user.displayName,
    });

    profileBtn.appendChild(avatar);
    profileBtn.appendChild(nameSpan);
    section.appendChild(profileBtn);

    const logoutBtn = createElement('button', {
      className: 'px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition',
      textContent: 'Logout',
    });

    logoutBtn.addEventListener('click', () => {
      if (onLogout) {
        onLogout();
      } else {
        clearUserData();
        router.navigate('/login');
      }
    });

    section.appendChild(logoutBtn);
  }

  return section;
}

export function updateNavbarActiveLink(): void {
  const currentPath = router.getCurrentPath();
  const links = document.querySelectorAll('nav a[href^="/"]:not([data-brand])');

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      addClass(link as HTMLElement, 'bg-gray-700', 'text-white');
    } else {
      (link as HTMLElement).classList.remove('bg-gray-700', 'text-white');
    }
  });
}
