


export interface User {
  id: number;
  userName: string;
  displayName: string;
  email?: string;
  profilePicture?: string;
  elo: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  createdAt: string;
  twoFactorEnabled?: boolean;
}


export interface UserLeaderboardRow {
  userId: number;
  displayName: string;
  avatar?: string;
  profilePicture?: string;
  elo: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  rank?: number;
}


export interface RegisterUserBody {
  userName: string;
  displayName: string;
  password: string;
  email?: string;
}


export interface LoginUserBody {
  userName: string;
  password: string;
}


export interface Login2FABody {
  userName: string;
  otp: string;
}


export interface Verify2FABody {
  otp: string;
}


export interface UpdateDisplayNameBody {
  displayName: string;
}


export interface UpdatePasswordBody {
  password: string;
  newPassword: string;
}


export interface GetUserParams {
  id: string;
}
