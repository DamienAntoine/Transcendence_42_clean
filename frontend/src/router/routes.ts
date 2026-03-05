

import type { Route } from './Router';


export function createLoadingComponent(): HTMLElement {
  const div = document.createElement('div');
  div.className = 'flex items-center justify-center h-screen';
  div.innerHTML = `
    <div class="text-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p class="text-gray-400">Loading...</p>
    </div>
  `;
  return div;
}


export async function createNotFoundComponent(): Promise<HTMLElement> {
  const div = document.createElement('div');
  div.className = 'flex items-center justify-center h-screen';
  div.innerHTML = `
    <div class="text-center">
      <h1 class="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <p class="text-xl text-gray-400 mb-8">Page not found</p>
      <a href="/" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition">
        Go Home
      </a>
    </div>
  `;
  return div;
}


export const routes: Route[] = [
  
  {
    path: '/login',
    component: async () => {
      const { LoginPage } = await import('@/pages/LoginPage');
      return LoginPage();
    },
    publicOnly: true,
    title: 'Login',
  },
  {
    path: '/register',
    component: async () => {
      const { RegisterPage } = await import('@/pages/RegisterPage');
      return RegisterPage();
    },
    publicOnly: true,
    title: 'Register',
  },
  {
    path: '/2fa',
    component: async () => {
      const { TwoFactorPage } = await import('@/pages/TwoFactorPage');
      return TwoFactorPage();
    },
    publicOnly: true,
    title: '2FA Verification',
  },

  
  {
    path: '/',
    component: async () => {
      const { HomePage } = await import('@/pages/HomePage');
      return HomePage();
    },
    requiresAuth: true,
    title: 'Home',
  },
  {
    path: '/profile',
    component: async () => {
      const { ProfilePage } = await import('@/pages/ProfilePage');
      return ProfilePage();
    },
    requiresAuth: true,
    title: 'Profile',
  },
  {
    path: '/profile/:id',
    component: async () => {
      const { ProfilePage } = await import('@/pages/ProfilePage');
      return ProfilePage();
    },
    requiresAuth: true,
    title: 'User Profile',
  },
  {
    path: '/leaderboard',
    component: async () => {
      const { LeaderboardPage } = await import('@/pages/LeaderboardPage');
      return LeaderboardPage();
    },
    requiresAuth: true,
    title: 'Leaderboard',
  },
  {
    path: '/friends',
    component: async () => {
      const { FriendsPage } = await import('@/pages/FriendsPage');
      return FriendsPage();
    },
    requiresAuth: true,
    title: 'Friends',
  },
  {
    path: '/history',
    component: async () => {
      const { MatchHistoryPage } = await import('@/pages/MatchHistoryPage');
      return MatchHistoryPage();
    },
    requiresAuth: true,
    title: 'Match History',
  },
  {
    path: '/match-history/:id',
    component: async () => {
      const { MatchHistoryPage } = await import('@/pages/MatchHistoryPage');
      return MatchHistoryPage();
    },
    requiresAuth: true,
    title: 'Match History',
  },

  
  {
    path: '/pong',
    component: async () => {
      const { PongMenuPage } = await import('@/pages/PongMenuPage');
      return PongMenuPage();
    },
    requiresAuth: true,
    title: 'Pong',
  },
  {
    path: '/pong/matchmaking',
    component: async () => {
      const { PongMatchmakingPage } = await import('@/pages/PongMatchmakingPage');
      return PongMatchmakingPage();
    },
    requiresAuth: true,
    title: 'Matchmaking',
  },
  {
    path: '/pong/custom',
    component: async () => {
      const { PongCustomMatchPage } = await import('@/pages/pong/PongCustomMatchPage');
      return PongCustomMatchPage();
    },
    requiresAuth: true,
    title: 'Custom Match',
  },
  {
    path: '/pong/game/:gameId',
    component: async () => {
      const { PongGamePage } = await import('@/pages/PongGamePage');
      return PongGamePage();
    },
    requiresAuth: true,
    title: 'Pong Game',
  },

  
  {
    path: '/chat',
    component: async () => {
      const { ChatPage } = await import('@/pages/chat/ChatPage');
      return ChatPage();
    },
    requiresAuth: true,
    title: 'Chat',
  },
  {
    path: '/direct-messages',
    component: async () => {
      const { DirectMessagePage } = await import('@/pages/chat/DirectMessagePage');
      return DirectMessagePage();
    },
    requiresAuth: true,
    title: 'Direct Messages',
  },

  
  {
    path: '/tournaments',
    component: async () => {
      const { TournamentListPage } = await import('@/pages/TournamentListPage');
      return TournamentListPage();
    },
    
    requiresAuth: false,
    title: 'Tournaments',
  },
  {
    path: '/tournaments/create',
    component: async () => {
      const { TournamentCreatePage } = await import('@/pages/TournamentCreatePage');
      return TournamentCreatePage();
    },
    requiresAuth: true,
    title: 'Create Tournament',
  },
  {
    path: '/tournaments/:id',
    component: async () => {
      const { TournamentDetailPage } = await import('@/pages/TournamentDetailPage');
      return TournamentDetailPage();
    },
    
    requiresAuth: false,
    title: 'Tournament',
  },
  {
    path: '/tournaments/:id/lobby',
    component: async () => {
      const { TournamentLobbyPage } = await import('@/pages/TournamentLobbyPage');
      return TournamentLobbyPage();
    },
    requiresAuth: true,
    title: 'Tournament Lobby',
  },
];
