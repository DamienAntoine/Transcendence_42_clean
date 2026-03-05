

import type { User } from '@/types';


const STORAGE_KEYS = {
  TOKEN: 'transcendence_token',
  USER: 'transcendence_user',
  THEME: 'transcendence_theme',
} as const;


export function setToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } catch (error) {
    console.error('Failed to save token:', error);
  }
}


export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('Failed to retrieve token:', error);
    return null;
  }
}


export function removeToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
}


export function hasToken(): boolean {
  return getToken() !== null;
}


export function setUser(user: User): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user:', error);
  }
}


export function getUser(): User | null {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;
    return JSON.parse(userStr) as User;
  } catch (error) {
    console.error('Failed to retrieve user:', error);
    return null;
  }
}


export function removeUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('Failed to remove user:', error);
  }
}


export function hasUser(): boolean {
  return getUser() !== null;
}


export function setTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
}


export function getTheme(): 'dark' | 'light' {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    return theme === 'light' ? 'light' : 'dark';
  } catch (error) {
    console.error('Failed to retrieve theme:', error);
    return 'dark';
  }
}


export function initTheme(): void {
  const theme = getTheme();
  setTheme(theme);
}


export function toggleTheme(): 'dark' | 'light' {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  return newTheme;
}


export function clearUserData(): void {
  removeToken();
  removeUser();
}


export function isAuthenticated(): boolean {
  return hasToken() && hasUser();
}


export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to save item "${key}":`, error);
  }
}


export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to retrieve item "${key}":`, error);
    return null;
  }
}


export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove item "${key}":`, error);
  }
}


export function clearAll(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}
