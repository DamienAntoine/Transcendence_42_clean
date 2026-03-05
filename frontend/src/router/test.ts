

import { router } from './Router';
import type { Route } from './Router';


function createTempPage(title: string, content: string): HTMLElement {
  const div = document.createElement('div');
  div.className = 'p-8';
  div.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-4">${title}</h1>
      <p class="text-gray-400 mb-4">${content}</p>
      <div class="space-x-4">
        <a href="/" class="text-primary-500 hover:text-primary-400">Home</a>
        <a href="/login" class="text-primary-500 hover:text-primary-400">Login</a>
        <a href="/about" class="text-primary-500 hover:text-primary-400">About</a>
      </div>
    </div>
  `;
  return div;
}


export const testRoutes: Route[] = [
  {
    path: '/',
    component: async () => createTempPage('Home', 'Welcome to Transcendence'),
    title: 'Home',
  },
  {
    path: '/login',
    component: async () => createTempPage('Login', 'Login page'),
    publicOnly: true,
    title: 'Login',
  },
  {
    path: '/about',
    component: async () => createTempPage('About', 'About page'),
    title: 'About',
  },
];


export function initTestRouter(): void {
  router.addRoutes(testRoutes);
  router.setNotFound(async () => {
    return createTempPage('404', 'Page not found');
  });
  router.setLoading(() => {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-center h-screen';
    div.innerHTML = '<p class="text-gray-400">Loading...</p>';
    return div;
  });
  router.init();
}
