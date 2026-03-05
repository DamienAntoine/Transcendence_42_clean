

import type { User, UserLeaderboardRow } from '@/types';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window === 'undefined') {
    console.warn('VITE_API_URL not set, using default localhost:3000');
    return 'http://localhost:3000';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const frontendPort = window.location.port;

  if (!frontendPort) {
    console.warn('VITE_API_URL not set, assuming backend on port 3000');
    return `${protocol}//${hostname}:3000`;
  }

  const backendPort = frontendPort === '5173' ? '3000' : frontendPort;
  console.warn(`VITE_API_URL not set, using ${protocol}//${hostname}:${backendPort}`);
  return `${protocol}//${hostname}:${backendPort}`;
};

const API_BASE_URL = getApiBaseUrl();


export function getAvatarUrl(avatar?: string | null): string | undefined {
  if (!avatar) return undefined;
  return `${API_BASE_URL}/avatars/${avatar}`;
}


export function mapBackendUser(backendUser: any): User {
  return {
    ...backendUser,
    profilePicture: getAvatarUrl(backendUser.avatar),
  };
}


export function mapLeaderboardRow(backendRow: any): UserLeaderboardRow {
  return {
    ...backendRow,
    profilePicture: getAvatarUrl(backendRow.avatar),
  };
}
