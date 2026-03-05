


export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
}


export interface ApiError {
  error: string;
  statusCode?: number;
}


export interface AuthResponse {
  token: string;
  userId: number;
  displayName: string;
  require2fa?: boolean;
}


export interface TwoFactorAuthResponse {
  require2fa: boolean;
  qrCode?: string;
  secret?: string;
}
