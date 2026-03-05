

import { isAuthenticated } from '@/utils/storage';


export interface Route {
  path: string;
  component: () => Promise<HTMLElement>;
  requiresAuth?: boolean;
  publicOnly?: boolean;
  title?: string;
}


export interface NavigationOptions {
  replace?: boolean;
  state?: unknown;
}


export type RouteChangeCallback = (path: string) => void;


export class Router {
  private routes: Map<string, Route> = new Map();
  private currentPath: string = '';
  private notFoundComponent: (() => Promise<HTMLElement>) | null = null;
  private loadingComponent: (() => HTMLElement) | null = null;
  private routeChangeCallbacks: Set<RouteChangeCallback> = new Set();

  constructor() {
    this.setupHistoryListeners();
  }


  private setupHistoryListeners(): void {

    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.pathname);
    });


    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && link.origin === window.location.origin) {

        if (link.target === '_blank' || link.hasAttribute('data-external')) {
          return;
        }

        e.preventDefault();
        const path = link.pathname;
        this.navigate(path);
      }
    });
  }


  addRoute(route: Route): void {
    this.routes.set(route.path, route);
  }


  addRoutes(routes: Route[]): void {
    routes.forEach((route) => this.addRoute(route));
  }


  setNotFound(component: () => Promise<HTMLElement>): void {
    this.notFoundComponent = component;
  }


  setLoading(component: () => HTMLElement): void {
    this.loadingComponent = component;
  }


  private matchRoute(path: string): Route | null {

    const exactMatch = this.routes.get(path);
    if (exactMatch) return exactMatch;


    for (const [routePath, route] of this.routes.entries()) {
      const pattern = this.pathToRegex(routePath);
      if (pattern.test(path)) {
        return route;
      }
    }

    return null;
  }


  private pathToRegex(path: string): RegExp {
    const pattern = path
      .replace(/:(\w+)/g, '([^/]+)')
      .replace(/\//g, '\\/');
    return new RegExp(`^${pattern}$`);
  }


  getParams(routePath: string, actualPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');

    routeParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1);
        params[paramName] = actualParts[index];
      }
    });

    return params;
  }


  private checkAuthGuards(route: Route): { canAccess: boolean; redirectTo?: string } {
    const authenticated = isAuthenticated();


    if (route.requiresAuth && !authenticated) {
      return { canAccess: false, redirectTo: '/login' };
    }


    if (route.publicOnly && authenticated) {
      return { canAccess: false, redirectTo: '/' };
    }

    return { canAccess: true };
  }


  private async handleRoute(path: string): Promise<void> {
    this.currentPath = path;


    const app = document.getElementById('app');
    if (!app) return;

    if (this.loadingComponent) {
      app.innerHTML = '';
      app.appendChild(this.loadingComponent());
    }


    const route = this.matchRoute(path);

    if (!route) {

      if (this.notFoundComponent) {
        const component = await this.notFoundComponent();
        app.innerHTML = '';
        app.appendChild(component);
      } else {
        app.innerHTML = '<div class="p-8 text-center"><h1 class="text-2xl">404 - Page not found</h1></div>';
      }
      this.updateTitle('404 - Not Found');
      return;
    }


    const { canAccess, redirectTo } = this.checkAuthGuards(route);
    if (!canAccess && redirectTo) {
      this.navigate(redirectTo, { replace: true });
      return;
    }


    try {
      const component = await route.component();
      app.innerHTML = '';
      app.appendChild(component);
      this.updateTitle(route.title);
      this.notifyRouteChange(path);
    } catch (error) {
      console.error('Error loading route component:', error);
      app.innerHTML = '<div class="p-8 text-center text-red-500"><h1 class="text-2xl">Error loading page</h1></div>';
    }
  }


  private updateTitle(title?: string): void {
    document.title = title ? `${title} - Transcendence` : 'Transcendence';
  }


  navigate(path: string, options: NavigationOptions = {}): void {
    const { replace = false, state = null } = options;

    if (path === this.currentPath) {
      return;
    }

    if (replace) {
      window.history.replaceState(state, '', path);
    } else {
      window.history.pushState(state, '', path);
    }

    this.handleRoute(path);
  }


  refresh(): void {
    this.handleRoute(this.currentPath);
  }


  back(): void {
    window.history.back();
  }


  forward(): void {
    window.history.forward();
  }


  onRouteChange(callback: RouteChangeCallback): () => void {
    this.routeChangeCallbacks.add(callback);
    return () => this.routeChangeCallbacks.delete(callback);
  }


  private notifyRouteChange(path: string): void {
    this.routeChangeCallbacks.forEach((callback) => {
      try {
        callback(path);
      } catch (error) {
        console.error('Error in route change callback:', error);
      }
    });
  }


  getCurrentPath(): string {
    return this.currentPath;
  }


  init(): void {
    this.handleRoute(window.location.pathname);
  }


  cleanup(): void {
    this.routeChangeCallbacks.clear();
  }
}


export const router = new Router();
