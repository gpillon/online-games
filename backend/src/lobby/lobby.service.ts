import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  CreateRoomRequest,
  GameConfig,
  GamePlayer,
  GameStatus,
  PlayerType,
  RoomListItem,
} from '@online-games/shared';
import { TressetteMode } from '@online-games/shared';
import { v4 as uuidv4 } from 'uuid';
import { GamesService } from '../games/games.service';
import { TressetteEngine } from '../games/engines/tressette/tressette.engine';
import { LobbyPersistenceService } from './lobby-persistence.service';

export interface LobbyRoom {
  id: string;
  name: string;
  config: GameConfig;
  players: GamePlayer[];
  status: GameStatus;
  hostId: string;
  createdAt: string;
  /** ISO timestamp of last meaningful human-driven lobby/game activity */
  lastHumanActivity: string;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  gameId?: string;
}

@Injectable()
export class LobbyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LobbyService.name);
  private readonly rooms = new Map<string, LobbyRoom>();
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly gamesService: GamesService,
    private readonly lobbyPersistence: LobbyPersistenceService,
  ) {}

  onModuleInit(): void {
    const data = this.lobbyPersistence.load();
    if (data?.rooms?.length) {
      for (const room of data.rooms) {
        const r = { ...room };
        if (!r.lastHumanActivity) {
          r.lastHumanActivity = r.createdAt;
        }
        this.rooms.set(r.id, r);
      }
      for (const [gameId, engineState] of Object.entries(data.engines ?? {})) {
        try {
          this.gamesService.restoreEngine(gameId, engineState);
        } catch (e) {
          this.logger.warn(`Failed to restore game ${gameId}: ${String(e)}`);
        }
      }
    }
    this.lobbyPersistence.attachAutosave(() => this.saveAll());
  }

  onModuleDestroy(): void {
    this.saveAll();
    this.lobbyPersistence.detachAutosave();
  }

  saveAll(): void {
    const rooms = this.listAllRooms();
    const engines = new Map<string, unknown>();
    for (const [gameId, engine] of this.gamesService.getAllEngines()) {
      if (engine instanceof TressetteEngine) {
        engines.set(gameId, engine.getPersistenceState());
      } else {
        engines.set(gameId, engine.getState());
      }
    }
    this.lobbyPersistence.save(rooms, engines);
  }

  createRoom(
    hostId: string,
    hostName: string,
    dto: CreateRoomRequest,
  ): LobbyRoom {
    const mode = this.modeFromId(dto.modeId);
    const maxPlayers = this.playersRequired(mode);
    if (dto.numPlayers && dto.numPlayers !== maxPlayers) {
      throw new BadRequestException('Player count does not match selected mode');
    }
    const id = uuidv4();
    const config: GameConfig = {
      gameType: dto.gameType,
      numPlayers: maxPlayers,
      options: { mode, modeId: dto.modeId },
    };
    const now = new Date().toISOString();
    const room: LobbyRoom = {
      id,
      name: dto.name,
      config,
      players: [
        {
          id: hostId,
          name: hostName,
          type: PlayerType.HUMAN,
          seatIndex: 0,
          connected: true,
        },
      ],
      status: GameStatus.WAITING,
      hostId,
      createdAt: now,
      lastHumanActivity: now,
      maxPlayers,
      isPrivate: dto.isPrivate,
      password: dto.password || undefined,
    };
    this.rooms.set(id, room);
    return room;
  }

  listAllRooms(): LobbyRoom[] {
    return [...this.rooms.values()];
  }

  listRooms(includePrivate = false): RoomListItem[] {
    return [...this.rooms.values()]
      .filter((r) => includePrivate || !r.isPrivate)
      .map((r) => ({
        id: r.id,
        name: r.name,
        gameType: r.config.gameType,
        currentPlayers: r.players.length,
        maxPlayers: r.maxPlayers,
        status: r.status,
        hostName: r.players.find((p) => p.id === r.hostId)?.name ?? 'Host',
        isPrivate: r.isPrivate,
        hasPassword: !!r.password,
        modeId: String(r.config.options['modeId'] ?? ''),
      }));
  }

  getRoom(roomId: string): LobbyRoom {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  tryGetRoom(roomId: string): LobbyRoom | undefined {
    return this.rooms.get(roomId);
  }

  findRoomByGameId(gameId: string): LobbyRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.gameId === gameId) return room;
    }
    return undefined;
  }

  joinRoom(
    roomId: string,
    userId: string,
    username: string,
    password?: string,
  ): LobbyRoom {
    const room = this.getRoom(roomId);
    if (room.players.some((p) => p.id === userId)) {
      room.lastHumanActivity = new Date().toISOString();
      return room;
    }
    if (room.status !== GameStatus.WAITING) {
      return room;
    }
    if (room.players.length >= room.maxPlayers) {
      throw new BadRequestException('Room is full');
    }
    if (room.password && room.password !== (password ?? '')) {
      throw new ForbiddenException('Invalid room password');
    }
    const seatIndex = room.players.length;
    room.players.push({
      id: userId,
      name: username,
      type: PlayerType.HUMAN,
      seatIndex,
      connected: true,
    });
    room.lastHumanActivity = new Date().toISOString();
    return room;
  }

  leaveRoom(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== userId);
    if (room.players.length === 0) {
      this.destroyRoom(roomId);
      return;
    }
    if (room.hostId === userId) {
      room.hostId = room.players[0].id;
    }
  }

  /** Removes game engine and room state. */
  private destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.gameId) {
      this.gamesService.removeGame(room.gameId);
    }
    this.rooms.delete(roomId);
    this.locks.delete(roomId);
  }

  closeRoom(roomId: string, requesterId: string): void {
    const room = this.getRoom(roomId);
    if (room.hostId !== requesterId) {
      throw new ForbiddenException('Only the host can close the room');
    }
    this.destroyRoom(roomId);
  }

  /** Used by idle cleanup (no host check). */
  forceCloseRoom(roomId: string): void {
    if (!this.rooms.has(roomId)) return;
    this.destroyRoom(roomId);
  }

  touchHumanActivity(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.lastHumanActivity = new Date().toISOString();
  }

  getStaleRooms(maxIdleMs: number): string[] {
    const now = Date.now();
    const stale: string[] = [];
    for (const room of this.rooms.values()) {
      const ts = Date.parse(room.lastHumanActivity);
      if (Number.isFinite(ts) && now - ts > maxIdleMs) {
        stale.push(room.id);
      }
    }
    return stale;
  }

  markPlayerConnection(
    roomId: string,
    userId: string,
    connected: boolean,
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const p = room.players.find((x) => x.id === userId);
    if (p) p.connected = connected;
    if (p && p.type === PlayerType.HUMAN && connected) {
      room.lastHumanActivity = new Date().toISOString();
    }
    if (room.gameId) {
      const engine = this.gamesService.tryGetEngine(room.gameId);
      if (engine && 'markPlayerConnected' in engine) {
        (engine as TressetteEngine).markPlayerConnected(userId, connected);
      }
    }
  }

  addAI(roomId: string, requesterId: string): LobbyRoom {
    const room = this.getRoom(roomId);
    if (room.hostId !== requesterId) {
      throw new ForbiddenException('Only host can add AI players');
    }
    if (room.status !== GameStatus.WAITING) {
      throw new BadRequestException('Game already started');
    }
    if (room.players.length >= room.maxPlayers) {
      throw new BadRequestException('Room is full');
    }
    const n = room.players.filter((p) => p.type === PlayerType.AI).length + 1;
    room.players.push({
      id: uuidv4(),
      name: `AI_${n}`,
      type: PlayerType.AI,
      seatIndex: room.players.length,
      connected: true,
    });
    room.lastHumanActivity = new Date().toISOString();
    return room;
  }

  startGame(roomId: string, requesterId: string): { gameId: string } {
    const room = this.getRoom(roomId);
    if (room.hostId !== requesterId) {
      throw new ForbiddenException('Only host can start the game');
    }
    if (room.status !== GameStatus.WAITING) {
      throw new BadRequestException('Game already started');
    }
    if (room.players.length !== room.maxPlayers) {
      throw new BadRequestException('Room is not full');
    }
    const gameId = uuidv4();
    const mode = this.modeFromId(String(room.config.options['modeId']));
    const engine = this.gamesService.createEngineForType(
      room.config.gameType,
      gameId,
      mode,
      typeof room.config.options['targetScore'] === 'number'
        ? (room.config.options['targetScore'] as number)
        : undefined,
    );
    for (const p of room.players) {
      engine.addPlayer({ ...p });
    }
    engine.start();
    const fullState = engine.getState() as { players: GamePlayer[] };
    room.players = fullState.players;
    room.gameId = gameId;
    room.status = GameStatus.IN_PROGRESS;
    room.lastHumanActivity = new Date().toISOString();
    return { gameId };
  }

  modeFromId(modeId: string): TressetteMode {
    switch (modeId) {
      case TressetteMode.TWO_PLAYERS:
        return TressetteMode.TWO_PLAYERS;
      case TressetteMode.THREE_WITH_MORTO:
        return TressetteMode.THREE_WITH_MORTO;
      case TressetteMode.FOUR_PLAYERS:
        return TressetteMode.FOUR_PLAYERS;
      default:
        return TressetteMode.FOUR_PLAYERS;
    }
  }

  playersRequired(mode: TressetteMode): number {
    switch (mode) {
      case TressetteMode.TWO_PLAYERS:
        return 2;
      case TressetteMode.THREE_WITH_MORTO:
        return 3;
      case TressetteMode.FOUR_PLAYERS:
        return 4;
      default:
        return 4;
    }
  }

  isRoomProcessing(roomId: string): boolean {
    return this.locks.has(roomId);
  }

  async runExclusive<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(roomId) ?? Promise.resolve();
    let releaseFn!: () => void;
    const gate = new Promise<void>((r) => {
      releaseFn = r;
    });
    this.locks.set(roomId, gate);
    try {
      await prev;
      return await fn();
    } finally {
      releaseFn();
      if (this.locks.get(roomId) === gate) {
        this.locks.delete(roomId);
      }
    }
  }

  finishRoomGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.gameId) {
      this.gamesService.removeGame(room.gameId);
      room.gameId = undefined;
    }
    room.status = GameStatus.FINISHED;
  }
}

