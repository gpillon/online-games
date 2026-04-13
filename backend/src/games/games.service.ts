import { Injectable, NotFoundException } from '@nestjs/common';
import { GameType, TressetteMode } from '@online-games/shared';
import { IGameEngine } from './interfaces/game-engine.interface';
import { TressetteEngine } from './engines/tressette/tressette.engine';

@Injectable()
export class GamesService {
  private readonly engines = new Map<string, IGameEngine>();

  createTressetteEngine(
    gameId: string,
    mode: TressetteMode,
    targetScore?: number,
  ): TressetteEngine {
    const engine = new TressetteEngine(gameId, {
      mode,
      targetScore: targetScore ?? 21,
    });
    this.engines.set(gameId, engine);
    return engine;
  }

  getEngine(gameId: string): IGameEngine {
    const engine = this.engines.get(gameId);
    if (!engine) {
      throw new NotFoundException('Game not found');
    }
    return engine;
  }

  tryGetEngine(gameId: string): IGameEngine | undefined {
    return this.engines.get(gameId);
  }

  removeGame(gameId: string): void {
    this.engines.delete(gameId);
  }

  createEngineForType(
    gameType: GameType,
    gameId: string,
    mode: TressetteMode,
    targetScore?: number,
  ): IGameEngine {
    if (gameType === GameType.TRESSETTE) {
      return this.createTressetteEngine(gameId, mode, targetScore);
    }
    throw new NotFoundException('Unsupported game type');
  }
}
