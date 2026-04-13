import { Logger, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import {
  CreateRoomRequest,
  GameType,
  JoinRoomRequest,
  PlayerType,
  WS_EVENTS,
} from '@online-games/shared';
import { Server, Socket } from 'socket.io';
import type { IGameEngine } from '../games/interfaces/game-engine.interface';
import type { LobbyRoom } from './lobby.service';
import { GamesService } from '../games/games.service';
import { LobbyService } from './lobby.service';
import { UsersService } from '../users/users.service';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { TressetteAI } from '../games/engines/tressette/tressette-ai';
import { JwtPayload } from '../auth/jwt.strategy';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
@UseFilters(new WsExceptionFilter())
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LobbyGateway.name);
  private readonly ai = new TressetteAI();

  constructor(
    private readonly lobbyService: LobbyService,
    private readonly gamesService: GamesService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;
    if (!token) {
      client.emit(WS_EVENTS.ERROR, { message: 'Missing auth token' });
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }
      client.data.userId = user.id;
      client.data.username = user.username;
      // Auto-rejoin active game rooms
      const rooms = this.lobbyService.listAllRooms();
      for (const room of rooms) {
        if (room.gameId && room.players.some((p) => p.id === user.id)) {
          void client.join(`room:${room.id}`);
          client.data.roomId = room.id;
          this.lobbyService.markPlayerConnection(room.id, user.id, true);
          const engine = this.gamesService.tryGetEngine(room.gameId);
          if (engine) {
            setTimeout(() => {
              client.emit(WS_EVENTS.GAME_STATE, engine.getClientState(user.id));
            }, 500);
          }
          break;
        }
      }
      this.logger.debug(`Client connected ${client.id} as ${user.username}`);
    } catch (err) {
      this.logger.warn(`WS auth failed for ${client.id}: ${String(err)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const roomId = client.data.roomId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (roomId && userId) {
      this.lobbyService.markPlayerConnection(roomId, userId, false);
      this.server.to(`room:${roomId}`).emit(WS_EVENTS.GAME_PLAYER_RECONNECTED, {
        userId,
        connected: false,
      });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_JOIN)
  handleLobbyJoin(@ConnectedSocket() client: Socket) {
    void client.join('lobby');
    this.emitRoomsUpdate();
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_LEAVE)
  handleLobbyLeave(@ConnectedSocket() client: Socket) {
    void client.leave('lobby');
  }

  @SubscribeMessage(WS_EVENTS.ROOM_CREATE)
  async handleRoomCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CreateRoomRequest,
  ) {
    const userId = client.data.userId as string;
    const username = client.data.username as string;
    this.logger.debug(`ROOM_CREATE from ${username}: ${JSON.stringify(body)}`);
    const room = this.lobbyService.createRoom(userId, username, body);
    await client.join(`room:${room.id}`);
    client.data.roomId = room.id;
    this.lobbyService.markPlayerConnection(room.id, userId, true);
    client.emit(WS_EVENTS.ROOM_UPDATE, room);
    this.emitRoomsUpdate();
    return { room };
  }

  @SubscribeMessage(WS_EVENTS.ROOM_JOIN)
  async handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinRoomRequest,
  ) {
    const userId = client.data.userId as string;
    const username = client.data.username as string;
    const room = this.lobbyService.joinRoom(
      body.roomId,
      userId,
      username,
      body.password,
    );
    await client.join(`room:${room.id}`);
    client.data.roomId = room.id;
    this.lobbyService.markPlayerConnection(room.id, userId, true);
    this.server.to(`room:${room.id}`).emit(WS_EVENTS.ROOM_PLAYER_JOINED, {
      userId,
      username,
    });
    this.server.to(`room:${room.id}`).emit(WS_EVENTS.ROOM_UPDATE, room);
    this.server.to(`room:${room.id}`).emit(WS_EVENTS.GAME_PLAYER_RECONNECTED, {
      userId,
      connected: true,
    });
    if (room.gameId) {
      void this.emitGameState(room.id, room.gameId);
    }
    this.emitRoomsUpdate();
    return { room };
  }

  @SubscribeMessage(WS_EVENTS.ROOM_LEAVE)
  handleRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ) {
    const userId = client.data.userId as string;
    this.lobbyService.leaveRoom(body.roomId, userId);
    void client.leave(`room:${body.roomId}`);
    if (client.data.roomId === body.roomId) {
      delete client.data.roomId;
    }
    this.server.to(`room:${body.roomId}`).emit(WS_EVENTS.ROOM_PLAYER_LEFT, {
      userId,
    });
    const room = this.lobbyService.tryGetRoom(body.roomId);
    if (room) {
      this.server.to(`room:${body.roomId}`).emit(WS_EVENTS.ROOM_UPDATE, room);
    }
    this.emitRoomsUpdate();
    return { ok: true };
  }

  @SubscribeMessage(WS_EVENTS.ROOM_ADD_AI)
  handleAddAi(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ) {
    const userId = client.data.userId as string;
    const room = this.lobbyService.addAI(body.roomId, userId);
    this.server.to(`room:${room.id}`).emit(WS_EVENTS.ROOM_UPDATE, room);
    this.emitRoomsUpdate();
    return { room };
  }

  @SubscribeMessage(WS_EVENTS.ROOM_START_GAME)
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ) {
    const userId = client.data.userId as string;
    this.logger.debug(`Starting game for room ${body.roomId} by ${userId}`);
    const { gameId } = this.lobbyService.startGame(body.roomId, userId);
    const room = this.lobbyService.getRoom(body.roomId);
    this.server
      .to(`room:${room.id}`)
      .emit(WS_EVENTS.ROOM_UPDATE, { ...room, activeGameId: gameId });
    await this.emitGameState(room.id, gameId);
    this.emitRoomsUpdate();
    this.logger.debug(`Game ${gameId} started, scheduling AI`);
    await this.maybeScheduleAi(room.id, gameId);
    return { gameId };
  }

  @SubscribeMessage(WS_EVENTS.GAME_REQUEST_STATE)
  async handleRequestGameState(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string },
  ) {
    const userId = client.data.userId as string;
    const room = this.lobbyService.findRoomByGameId(body.gameId);
    if (!room) throw new WsException('Game room not found');
    if (!room.players.some((p) => p.id === userId)) {
      throw new WsException('Not a player in this game');
    }
    const engine = this.gamesService.tryGetEngine(body.gameId);
    if (!engine) throw new WsException('Game not found');
    if (!client.data.roomId) {
      client.data.roomId = room.id;
      void client.join(`room:${room.id}`);
      this.lobbyService.markPlayerConnection(room.id, userId, true);
    }
    client.emit(WS_EVENTS.GAME_STATE, engine.getClientState(userId));
    return { ok: true };
  }

  @SubscribeMessage(WS_EVENTS.ROOM_SPECTATE)
  async handleSpectate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ) {
    const room = this.lobbyService.tryGetRoom(body.roomId);
    if (!room) throw new WsException('Room not found');
    void client.join(`room:${room.id}`);
    client.data.roomId = room.id;
    client.data.spectator = true;
    client.emit(WS_EVENTS.ROOM_UPDATE, room);
    if (room.gameId) {
      const engine = this.gamesService.tryGetEngine(room.gameId);
      if (engine) {
        client.emit(WS_EVENTS.GAME_STATE, engine.getSpectatorState?.() ?? engine.getClientState('__spectator'));
      }
    }
    return { ok: true };
  }

  @SubscribeMessage(WS_EVENTS.GAME_MOVE)
  async handleGameMove(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      roomId?: string;
      gameId: string;
      move?: unknown;
      type?: string;
      data?: Record<string, unknown>;
    },
  ) {
    const userId = client.data.userId as string;
    const roomId =
      body.roomId ?? (client.data.roomId as string | undefined) ?? '';
    const room = this.lobbyService.getRoom(roomId);
    if (room.gameId !== body.gameId) {
      throw new WsException('Game mismatch');
    }
    const engine = this.gamesService.getEngine(body.gameId);
    const current = engine.getCurrentPlayerId();
    if (current !== userId) {
      throw new WsException('Not your turn');
    }
    const move =
      body.move ??
      (body.type === 'play_card'
        ? { type: 'play', cardId: (body.data as { cardId: string })?.cardId }
        : body.data);
    const result = engine.makeMove(userId, move);
    if (!result.success) {
      this.server.to(`room:${roomId}`).emit(WS_EVENTS.GAME_ERROR, {
        message: result.error,
      });
      return result;
    }
    this.server.to(`room:${roomId}`).emit(WS_EVENTS.GAME_MOVE_RESULT, {
      userId,
      result,
    });
    if (result.trickComplete) {
      this.server.to(`room:${roomId}`).emit(WS_EVENTS.GAME_TRICK_COMPLETE, {
        trickWinner: result.trickWinner,
      });
    }
    if (result.handComplete) {
      this.server.to(`room:${roomId}`).emit(WS_EVENTS.GAME_HAND_COMPLETE, {
        teamScores: (engine.getState() as { teamScores: [number, number] })
          .teamScores,
      });
    }
    if (result.trickComplete) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    }
    await this.emitGameState(roomId, body.gameId);
    if (result.gameOver) {
      this.server.to(`room:${roomId}`).emit(WS_EVENTS.GAME_OVER, {
        results: engine.getResults(),
      });
      await this.persistScores(room, engine);
      this.lobbyService.finishRoomGame(roomId);
    } else {
      await this.maybeScheduleAi(roomId, body.gameId);
    }
    return result;
  }

  @SubscribeMessage(WS_EVENTS.ROOM_CHAT)
  handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; message: string },
  ) {
    const userId = client.data.userId as string;
    const username = client.data.username as string;
    const msg = {
      id: `${Date.now()}-${userId}`,
      roomId: body.roomId,
      userId,
      username,
      message: body.message,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`room:${body.roomId}`).emit(WS_EVENTS.ROOM_CHAT_MESSAGE, msg);
    return { ok: true };
  }

  private emitRoomsUpdate() {
    this.server.to('lobby').emit(WS_EVENTS.LOBBY_ROOMS_UPDATE, this.lobbyService.listRooms());
  }

  private async emitGameState(roomId: string, gameId: string) {
    const engine = this.gamesService.tryGetEngine(gameId);
    if (!engine) return;
    const room = this.lobbyService.getRoom(roomId);
    const sockets = await this.server.in(`room:${roomId}`).fetchSockets();
    for (const s of sockets) {
      const uid = s.data.userId as string | undefined;
      if (!uid) continue;
      if (s.data.spectator) {
        s.emit(WS_EVENTS.GAME_STATE, engine.getSpectatorState?.() ?? engine.getClientState('__spectator'));
      } else if (room.players.some((p) => p.id === uid)) {
        s.emit(WS_EVENTS.GAME_STATE, engine.getClientState(uid));
      }
    }
  }

  private async maybeScheduleAi(roomId: string, gameId: string) {
    const engine = this.gamesService.tryGetEngine(gameId);
    if (!engine || engine.isGameOver()) {
      this.logger.debug(`maybeScheduleAi: engine missing or game over`);
      return;
    }
    const room = this.lobbyService.getRoom(roomId);
    const currentId = engine.getCurrentPlayerId();
    const player = room.players.find((p) => p.id === currentId);
    this.logger.debug(
      `maybeScheduleAi: currentPlayer=${currentId} type=${player?.type} name=${player?.name}`,
    );
    if (!player || player.type !== PlayerType.AI) return;
    const delay = 600 + Math.floor(Math.random() * 900);
    setTimeout(() => {
      void this.runAiTurn(roomId, gameId, currentId);
    }, delay);
  }

  private async runAiTurn(roomId: string, gameId: string, expectedPlayer: string) {
    await this.lobbyService.runExclusive(roomId, async () => {
      const engine = this.gamesService.tryGetEngine(gameId);
      if (!engine || engine.isGameOver()) return;
      if (engine.getCurrentPlayerId() !== expectedPlayer) return;
      this.logger.debug(`AI turn: ${expectedPlayer} in game ${gameId}`);
      const state = engine.getClientState(expectedPlayer);
      const move = this.ai.chooseMove(state, expectedPlayer);
      this.logger.debug(`AI move: ${JSON.stringify(move)}`);
      const result = engine.makeMove(expectedPlayer, move);
      if (!result.success) {
        this.server.to(`room:${roomId}`).emit(WS_EVENTS.GAME_ERROR, {
          message: result.error,
        });
        return;
      }
      this.server.to(`room:${roomId}`).emit(WS_EVENTS.GAME_MOVE_RESULT, {
        userId: expectedPlayer,
        result,
      });
      if (result.trickComplete) {
        this.server
          .to(`room:${roomId}`)
          .emit(WS_EVENTS.GAME_TRICK_COMPLETE, {
            trickWinner: result.trickWinner,
          });
      }
      if (result.handComplete) {
        this.server
          .to(`room:${roomId}`)
          .emit(WS_EVENTS.GAME_HAND_COMPLETE, {
            teamScores: (engine.getState() as { teamScores: [number, number] })
              .teamScores,
          });
      }
      if (result.trickComplete) {
        await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      }
      await this.emitGameState(roomId, gameId);
      if (result.gameOver) {
        const room = this.lobbyService.getRoom(roomId);
        this.server.to(`room:${roomId}`).emit(WS_EVENTS.GAME_OVER, {
          results: engine.getResults(),
        });
        await this.persistScores(room, engine);
        this.lobbyService.finishRoomGame(roomId);
      } else {
        await this.maybeScheduleAi(roomId, gameId);
      }
    });
  }

  private async persistScores(room: LobbyRoom, engine: IGameEngine) {
    const results = engine.getResults() as {
      winningTeam: number;
      teamScores: [number, number];
      players: { id: string; team?: number }[];
    };
    const gameType =
      room.config.gameType === GameType.TRESSETTE
        ? 'tressette'
        : String(room.config.gameType);
    for (const p of results.players) {
      const roomPlayer = room.players.find((x) => x.id === p.id);
      if (!roomPlayer || roomPlayer.type === PlayerType.AI) continue;
      const dbUser = await this.usersService.findById(p.id);
      if (!dbUser) continue;
      const team = p.team ?? 0;
      const won = team === results.winningTeam;
      const teammates = results.players.filter((x) => (x.team ?? 0) === team);
      const pointsShare =
        results.teamScores[team] / Math.max(1, teammates.length);
      await this.usersService.recordGameScore({
        userId: p.id,
        gameType,
        points: pointsShare,
        won,
        gameId: room.gameId ?? room.id,
      });
    }
  }
}

