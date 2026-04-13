import { Card } from '@online-games/shared';

export interface IGameEngine {
  getGameId(): string;
  getState(): unknown;
  getClientState(playerId: string): unknown;
  makeMove(playerId: string, move: unknown): MoveResult;
  isValidMove(playerId: string, move: unknown): boolean;
  getCurrentPlayerId(): string;
  isGameOver(): boolean;
  getResults(): unknown;
  addPlayer(player: unknown): void;
  start(): void;
}

export interface MoveResult {
  success: boolean;
  error?: string;
  stateUpdate?: unknown;
  trickComplete?: boolean;
  handComplete?: boolean;
  gameOver?: boolean;
  nextPlayerId?: string;
  trickWinner?: { playerId: string; cards: unknown[] };
}
