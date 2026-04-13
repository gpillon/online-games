export enum GameType {
  TRESSETTE = 'tressette',
}

export enum GameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
}

export enum PlayerType {
  HUMAN = 'human',
  AI = 'ai',
  MORTO = 'morto',
}

export interface GamePlayer {
  id: string;
  name: string;
  type: PlayerType;
  seatIndex: number;
  team?: number;
  connected?: boolean;
}

export interface GameConfig {
  gameType: GameType;
  numPlayers: number;
  options: Record<string, unknown>;
}

export interface GameStateBase {
  gameId: string;
  gameType: GameType;
  status: GameStatus;
  players: GamePlayer[];
  currentPlayerIndex: number;
  scores: Record<string, number>;
  round: number;
  createdAt: string;
}

export interface GameMove {
  playerId: string;
  gameId: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface GameResult {
  gameId: string;
  gameType: GameType;
  winners: string[];
  finalScores: Record<string, number>;
  duration: number;
  rounds: number;
}

export interface GameDefinition {
  type: GameType;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  supportedModes: GameModeConfig[];
  icon: string;
}

export interface GameModeConfig {
  id: string;
  name: string;
  description: string;
  numPlayers: number;
  numHumansRequired: number;
  teamBased: boolean;
  numTeams?: number;
}
