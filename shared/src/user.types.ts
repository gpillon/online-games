export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  isAnonymous: boolean;
  avatarUrl?: string;
  createdAt: string;
  role: UserRole;
  isBlocked: boolean;
  stats: UserStats;
}

export interface AdminUserView {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  isBlocked: boolean;
  isAnonymous: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  gameStats: Record<string, GameSpecificStats>;
}

export interface GameSpecificStats {
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  highestScore: number;
  winRate: number;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  totalPoints: number;
  gamesWon: number;
  gamesPlayed: number;
  winRate: number;
}
