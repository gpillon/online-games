import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { LobbyRoom } from './lobby.service';
import { LobbyRoomEntity } from './entities/lobby-room.entity';

const SAVE_INTERVAL_MS = 30_000;

export interface LobbyPersistencePayload {
  rooms: LobbyRoom[];
  engines: Record<string, unknown>;
}

@Injectable()
export class LobbyPersistenceService implements OnModuleDestroy {
  private readonly logger = new Logger(LobbyPersistenceService.name);
  private interval: ReturnType<typeof setInterval> | null = null;
  private boundSave: (() => void) | null = null;
  private saving = false;

  constructor(
    @InjectRepository(LobbyRoomEntity)
    private readonly repo: Repository<LobbyRoomEntity>,
  ) {}

  async save(rooms: LobbyRoom[], engines: Map<string, unknown>): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    try {
      const currentIds = rooms.map((r) => r.id);

      await this.repo.manager.transaction(async (em) => {
        const repo = em.getRepository(LobbyRoomEntity);

        if (currentIds.length > 0) {
          await repo
            .createQueryBuilder()
            .delete()
            .where('id NOT IN (:...ids)', { ids: currentIds })
            .execute();
        } else {
          await repo.clear();
        }

        const entities: LobbyRoomEntity[] = rooms.map((room) => {
          const entity = new LobbyRoomEntity();
          entity.id = room.id;
          entity.roomData = room as unknown as Record<string, unknown>;
          entity.engineState =
            (engines.get(room.gameId ?? '') as Record<string, unknown> | undefined) ?? null;
          return entity;
        });

        if (entities.length > 0) {
          await repo.save(entities);
        }
      });
    } catch (e) {
      this.logger.warn(`Failed to persist lobby state: ${String(e)}`);
    } finally {
      this.saving = false;
    }
  }

  async load(): Promise<LobbyPersistencePayload | null> {
    try {
      const rows = await this.repo.find();
      if (!rows.length) return null;

      const rooms: LobbyRoom[] = [];
      const engines: Record<string, unknown> = {};

      for (const row of rows) {
        const room = row.roomData as unknown as LobbyRoom;
        if (room && room.id) {
          rooms.push(room);
          if (room.gameId && row.engineState) {
            engines[room.gameId] = row.engineState;
          }
        }
      }

      return rooms.length ? { rooms, engines } : null;
    } catch (e) {
      this.logger.warn(`Failed to load lobby state from DB: ${String(e)}`);
      return null;
    }
  }

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
