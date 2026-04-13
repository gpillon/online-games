import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GameStatus, RoomListItem } from '@online-games/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { GetRoomParamDto } from './dto/get-room-param.dto';
import { LobbyService, LobbyRoom } from './lobby.service';

@ApiTags('lobby')
@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobbyService: LobbyService) {}

  @Get('rooms')
  @ApiOkResponse({ description: 'Public room list' })
  listRooms(): RoomListItem[] {
    return this.lobbyService.listRooms();
  }

  @Post('rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Created room' })
  createRoom(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateRoomDto,
  ): LobbyRoom {
    return this.lobbyService.createRoom(user.id, user.username, dto);
  }

  @Get('rooms/:id')
  @ApiOkResponse({ description: 'Room snapshot' })
  getRoom(@Param() params: GetRoomParamDto): LobbyRoom {
    return this.lobbyService.getRoom(params.id);
  }

  @Get('my-games')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Rooms the user is in that are waiting or in progress' })
  getMyActiveGames(@CurrentUser() user: UserEntity): {
    roomId: string;
    gameId: string;
    name: string;
    status: GameStatus;
    hasPassword: boolean;
  }[] {
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
        hasPassword: !!r.password,
      }));
  }
}
