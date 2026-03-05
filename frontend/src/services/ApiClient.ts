

import { getToken } from '@/utils/storage';
import type { ApiError } from '@/types';

// Get API URL from environment or fallback to window location
const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port || '3000';
  return `${protocol}//${hostname}:${port === '5173' ? '3000' : port}`;
};

const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TIMEOUT: 30000,
  DEFAULT_TIMEOUT: 10000,
  UPLOAD_TIMEOUT: 120000
} as const;
interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
}


export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}


export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = API_CONFIG.BASE_URL, timeout: number = API_CONFIG.TIMEOUT) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
    console.log('🔗 API Client initialized with base URL:', this.baseUrl);
  }


  private buildHeaders(skipAuth: boolean = false, includeContentType: boolean = true): HeadersInit {
    const headers: HeadersInit = {};

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    if (!skipAuth) {
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }


  private async handleResponse<T>(response: Response): Promise<T> {

    if (response.ok) {

      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }


      return {} as T;
    }


    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.error || errorMessage;
      } else {
        const text = await response.text();
        if (text) errorMessage = text;
      }
    } catch {

    }

    throw new ApiClientError(response.status, errorMessage);
  }


  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError(408, 'Request timeout');
      }
      throw error;
    }
  }


  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { timeout = this.defaultTimeout, skipAuth = false, ...fetchOptions } = options;

    const url = `${this.baseUrl}${endpoint}`;

    const hasBody = fetchOptions.body !== undefined;
    const headers = this.buildHeaders(skipAuth, hasBody);

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          ...fetchOptions,
          headers: {
            ...headers,
            ...fetchOptions.headers,
          },
        },
        timeout
      );

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(500, 'Network error', error);
    }
  }


  async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }


  async post<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }


  async put<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }


  async patch<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }


  async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }


  async uploadFile<T>(
    endpoint: string,
    file: File,
    fieldName: string = 'file',
    options?: Omit<ApiRequestOptions, 'body'>
  ): Promise<T> {

    const { skipAuth = false, timeout = API_CONFIG.UPLOAD_TIMEOUT } = options || {};
    const url = `${this.baseUrl}${endpoint}`;

    const formData = new FormData();
    formData.append(fieldName, file);

    const headers: HeadersInit = {};
    if (!skipAuth) {
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'PUT',
          body: formData,
          headers,
        },
        timeout
      );

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(500, 'Upload failed', error);
    }
  }
}


export const apiClient = new ApiClient();
