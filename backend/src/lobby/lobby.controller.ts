import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateRoomRequest, GameStatus, RoomListItem } from '@online-games/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LobbyService, LobbyRoom } from './lobby.service';

@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobbyService: LobbyService) {}

  @Get('rooms')
  listRooms(): RoomListItem[] {
    return this.lobbyService.listRooms();
  }

  @Post('rooms')
  @UseGuards(JwtAuthGuard)
  createRoom(
    @CurrentUser() user: { id: string; username: string },
    @Body() dto: CreateRoomRequest,
  ): LobbyRoom {
    return this.lobbyService.createRoom(user.id, user.username, dto);
  }

  @Get('rooms/:id')
  getRoom(@Param('id') id: string): LobbyRoom {
    return this.lobbyService.getRoom(id);
  }

  @Get('my-games')
  @UseGuards(JwtAuthGuard)
  getMyActiveGames(
    @CurrentUser() user: { id: string },
  ): { roomId: string; gameId: string; name: string; status: GameStatus }[] {
    return this.lobbyService
      .listAllRooms()
      .filter(
        (r) =>
          r.players.some((p) => p.id === user.id) &&
          (r.status === GameStatus.IN_PROGRESS || r.status === GameStatus.WAITING),
      )
      .map((r) => ({
        roomId: r.id,
        gameId: r.gameId ?? '',
        name: r.name,
        status: r.status,
      }));
  }
}
