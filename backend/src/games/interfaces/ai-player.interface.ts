export interface IAIPlayer {
  chooseMove(gameState: unknown, playerId: string): unknown;
  getDifficulty(): string;
}
