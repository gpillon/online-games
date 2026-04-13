import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { LobbyRoom } from './lobby.service';

const SAVE_INTERVAL_MS = 30_000;

export interface LobbyPersistencePayload {
  rooms: LobbyRoom[];
  engines: Record<string, unknown>;
}

@Injectable()
export class LobbyPersistenceService implements OnModuleDestroy {
  private readonly logger = new Logger(LobbyPersistenceService.name);
  private readonly filePath = join(process.cwd(), 'data', 'lobby-state.json');
  private interval: ReturnType<typeof setInterval> | null = null;
  private boundSave: (() => void) | null = null;

  save(rooms: LobbyRoom[], engines: Map<string, unknown>): void {
    const enginesObj = Object.fromEntries(engines);
    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });
    const payload: LobbyPersistencePayload = { rooms, engines: enginesObj };
    writeFileSync(this.filePath, JSON.stringify(payload), 'utf-8');
  }

  load(): LobbyPersistencePayload | null {
    try {
      if (!existsSync(this.filePath)) {
        return null;
      }
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as LobbyPersistencePayload;
      if (!parsed || !Array.isArray(parsed.rooms) || typeof parsed.engines !== 'object') {
        return null;
      }
      return {
        rooms: parsed.rooms,
        engines: parsed.engines ?? {},
      };
    } catch (e) {
      this.logger.warn(`Failed to load lobby state: ${String(e)}`);
      return null;
    }
  }

  /** Registers periodic save and process signal handlers (same callback reference for clean teardown). */
  attachAutosave(saveAll: () => void): void {
    this.detachAutosave();
    this.boundSave = saveAll;
    this.interval = setInterval(saveAll, SAVE_INTERVAL_MS);
    process.on('SIGINT', saveAll);
    process.on('SIGTERM', saveAll);
  }

  detachAutosave(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.boundSave) {
      process.off('SIGINT', this.boundSave);
      process.off('SIGTERM', this.boundSave);
      this.boundSave = null;
    }
  }

  onModuleDestroy(): void {
    this.detachAutosave();
  }
}
