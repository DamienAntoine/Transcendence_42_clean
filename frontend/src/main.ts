import './style.css';
import { router } from '@/router/Router';
import { routes, createLoadingComponent, createNotFoundComponent } from '@/router/routes';
import { authService } from '@/services/AuthService';
import { initTheme, isAuthenticated, getUser } from '@/utils/storage';
import { Navbar, updateNavbarActiveLink } from '@/components/Navbar';
import { showError, showSuccess } from '@/components/Notification';
import { initFriendsWidget, destroyFriendsWidget } from '@/components/FriendsWidget';
import { invitationPollingService } from '@/services/InvitationPollingService';
import { statusWebSocketService } from '@/services/StatusWebSocketService';

interface AppState {
  initialized: boolean;
  navbarMounted: boolean;
  friendsWidgetMounted: boolean;
}

const appState: AppState = {
  initialized: false,
  navbarMounted: false,
  friendsWidgetMounted: false,
};

function initializeTheme(): void {
  try {
    initTheme();
    console.log('Theme initialized');
  } catch (error) {
    console.error('Failed to initialize theme:', error);
  }
}

function initializeRouter(): void {
  try {
    router.addRoutes(routes);

    router.setLoading(createLoadingComponent);

    router.setNotFound(createNotFoundComponent);

    router.onRouteChange((path) => {
      updateNavbarActiveLink();

      window.scrollTo({ top: 0, behavior: 'smooth' });

      console.log(`Route changed: ${path}`);
    });

    console.log('Router initialized with', routes.length, 'routes');
  } catch (error) {
    console.error('Failed to initialize router:', error);
    throw error;
  }
}

async function validateAuthentication(): Promise<void> {
  if (!isAuthenticated()) {
    console.log('User not authenticated');
    return;
  }

  try {
    await authService.fetchCurrentUser();
    const user = getUser();

    if (user) {
      console.log('User authenticated:', user.displayName);
    }
  } catch (error) {
    console.error('Authentication validation failed:', error);
    showError('Your session has expired. Please login again.');
  }
}

function mountNavbar(): void {
  if (!isAuthenticated()) {
    return;
  }

  if (appState.navbarMounted) {
    return;
  }

  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  try {
    const navbar = Navbar({
      fixed: true,
      showProfile: true,
      onLogout: handleLogout,
    });

    if (app.firstChild) {
      app.insertBefore(navbar, app.firstChild);
    } else {
      app.appendChild(navbar);
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.id = 'content-wrapper';
    contentWrapper.className = 'pt-16';

    while (app.children.length > 1) {
      contentWrapper.appendChild(app.children[1]);
    }

    app.appendChild(contentWrapper);

    appState.navbarMounted = true;
    console.log('Navbar mounted');
  } catch (error) {
    console.error('Failed to mount navbar:', error);
  }
}

function unmountNavbar(): void {
  if (!appState.navbarMounted) {
    return;
  }

  const navbar = document.querySelector('nav');
  const wrapper = document.getElementById('content-wrapper');

  if (navbar) {
    navbar.remove();
  }

  if (wrapper) {
    const app = document.getElementById('app');
    if (app) {
      while (wrapper.firstChild) {
        app.appendChild(wrapper.firstChild);
      }
      wrapper.remove();
    }
  }

  appState.navbarMounted = false;
  console.log('Navbar unmounted');
}

function mountFriendsWidget(): void {
  if (!isAuthenticated()) {
    return;
  }

  if (appState.friendsWidgetMounted) {
    return;
  }

  try {
    const widget = initFriendsWidget();
    document.body.appendChild(widget);
    appState.friendsWidgetMounted = true;
    console.log('Friends widget mounted');
  } catch (error) {
    console.error('Failed to mount friends widget:', error);
  }
}

function unmountFriendsWidget(): void {
  if (!appState.friendsWidgetMounted) {
    return;
  }

  destroyFriendsWidget();
  appState.friendsWidgetMounted = false;
  console.log('Friends widget unmounted');
}

function handleLogout(): void {
  try {
    statusWebSocketService.disconnect();

    invitationPollingService.stop();

    authService.logout();
    unmountNavbar();
    unmountFriendsWidget();
    showSuccess('Successfully logged out');
    router.navigate('/login');
    console.log('User logged out');
  } catch (error) {
    console.error('Logout failed:', error);
    showError('Logout failed. Please try again.');
  }
}

function setupGlobalErrorHandling(): void {
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);

    if (event.error?.name !== 'ApiClientError') {
      showError('An unexpected error occurred. Please try again.');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    if (event.reason?.name !== 'ApiClientError') {
      showError('An unexpected error occurred. Please try again.');
    }
  });

  console.log('Global error handling configured');
}

function setupNavbarManagement(): void {
  router.onRouteChange((path) => {
    const publicRoutes = ['/login', '/register', '/2fa'];
    const isPublicRoute = publicRoutes.includes(path);

    if (isAuthenticated() && !isPublicRoute) {
      mountNavbar();
      mountFriendsWidget();

      if (!statusWebSocketService.isConnected()) {
        console.log('Connecting status WebSocket...');
        statusWebSocketService.connect();
      }
    } else {
      unmountNavbar();
      unmountFriendsWidget();

      if (statusWebSocketService.isConnected()) {
        console.log('Disconnecting status WebSocket...');
        statusWebSocketService.disconnect();
      }
    }
  });

  console.log('Navbar management configured');
}

function setupBeforeUnload(): void {
  window.addEventListener('beforeunload', () => {
    router.cleanup();

    console.log('Application cleanup completed');
  });

  console.log('Beforeunload handler configured');
}

function showSplashScreen(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="flex items-center justify-center h-screen">
      <div class="text-center">
        <div class="mb-8">
          <h1 class="text-5xl font-bold text-primary-500 mb-2 animate-pulse">
            Transcendence
          </h1>
          <p class="text-gray-400 text-lg">
            The ultimate Pong experience
          </p>
        </div>
        <div class="flex items-center justify-center space-x-2">
          <div class="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
    </div>
  `;
}

function hideSplashScreen(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = '';
}

async function initializeApp(): Promise<void> {
  console.log('Initializing Transcendence...');

  try {
    showSplashScreen();

    initializeTheme();

    initializeRouter();

    await validateAuthentication();

    setupGlobalErrorHandling();

    setupNavbarManagement();

    setupBeforeUnload();

    hideSplashScreen();

    if (isAuthenticated()) {
      mountNavbar();
      mountFriendsWidget();

      console.log('🔌 Connecting status WebSocket (initial)...');
      statusWebSocketService.connect();

      invitationPollingService.start();
    }

    router.init();

    appState.initialized = true;
    console.log('Transcendence initialized successfully');
    console.log('App state:', appState);

  } catch (error) {
    console.error('Failed to initialize application:', error);

    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div class="flex items-center justify-center h-screen bg-gray-900">
          <div class="text-center max-w-md p-8">
            <div class="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 class="text-3xl font-bold text-white mb-4">
              Failed to initialize application
            </h1>
            <p class="text-gray-400 mb-6">
              An error occurred while starting Transcendence. Please refresh the page.
            </p>
            <button
              onclick="window.location.reload()"
              class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      `;
    }

    throw error;
  }
}

function main(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}

main();

if (typeof window !== 'undefined') {
  (window as any).__TRANSCENDENCE__ = {
    router,
    authService,
    appState,
    mountNavbar,
    unmountNavbar,
    validateAuthentication,
    statusWebSocketService,
  };

  console.log('Debug utilities available at window.__TRANSCENDENCE__');
}
