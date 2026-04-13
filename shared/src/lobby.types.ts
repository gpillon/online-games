import { GameConfig, GamePlayer, GameStatus, GameType } from './game.interfaces';

export interface GameRoom {
  id: string;
  name: string;
  config: GameConfig;
  players: GamePlayer[];
  status: GameStatus;
  hostId: string;
  createdAt: string;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
}

export interface CreateRoomRequest {
  name: string;
  gameType: GameType;
  numPlayers: number;
  modeId: string;
  isPrivate: boolean;
  password?: string;
}

export interface JoinRoomRequest {
  roomId: string;
  password?: string;
}

export interface RoomListItem {
  id: string;
  name: string;
  gameType: GameType;
  currentPlayers: number;
  maxPlayers: number;
  status: GameStatus;
  hostName: string;
  isPrivate: boolean;
  hasPassword: boolean;
  modeId: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}
