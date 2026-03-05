

import { apiClient, ApiClientError } from './ApiClient';
import { mapBackendUser } from '@/utils/userMapper';
import {
  setToken,
  setUser,
  clearUserData,
  getToken,
  isAuthenticated as checkAuthenticated,
} from '@/utils/storage';
import type {
  AuthResponse,
  TwoFactorAuthResponse,
  LoginUserBody,
  Login2FABody,
  RegisterUserBody,
  Verify2FABody,
  User,
} from '@/types';


export class AuthService {
  
  async register(data: RegisterUserBody): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/user/register', data, {
        skipAuth: true,
      });

      
      if (response.token) {
        setToken(response.token);
        await this.fetchCurrentUser();
      }

      return response;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw new Error(error.message);
      }
      throw new Error('Registration failed');
    }
  }

  
  async login(data: LoginUserBody): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/user/login', data, {
        skipAuth: true,
      });

      
      if (response.require2fa) {
        return response;
      }

      
      if (response.token) {
        setToken(response.token);
        await this.fetchCurrentUser();
      }

      return response;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw new Error(error.message);
      }
      throw new Error('Login failed');
    }
  }

  
  async login2FA(data: Login2FABody): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/user/login2fa', data, {
        skipAuth: true,
      });

      
      if (response.token) {
        setToken(response.token);
        await this.fetchCurrentUser();
      }

      return response;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw new Error(error.message);
      }
      throw new Error('2FA login failed');
    }
  }

  
  async enable2FA(): Promise<TwoFactorAuthResponse> {
    try {
      const response = await apiClient.put<TwoFactorAuthResponse>('/user/enable2fa');
      return response;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to enable 2FA');
    }
  }

  
  async verify2FA(data: Verify2FABody): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        '/user/verify2fa',
        data
      );
      return response;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to verify 2FA code');
    }
  }

  
  async fetchCurrentUser(): Promise<User> {
    try {
      const backendUser = await apiClient.get<any>('/user/me');
      const user = mapBackendUser(backendUser);
      setUser(user);
      return user;
    } catch (error) {
      if (error instanceof ApiClientError) {
        
        if (error.statusCode === 401) {
          this.logout();
        }
        throw new Error(error.message);
      }
      throw new Error('Failed to fetch user');
    }
  }

  
  logout(): void {
    clearUserData();
  }

  
  isAuthenticated(): boolean {
    return checkAuthenticated();
  }

  
  getAuthToken(): string | null {
    return getToken();
  }

  
  async validateToken(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      await this.fetchCurrentUser();
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  
  async refreshUser(): Promise<User | null> {
    try {
      return await this.fetchCurrentUser();
    } catch {
      return null;
    }
  }
}


export const authService = new AuthService();
