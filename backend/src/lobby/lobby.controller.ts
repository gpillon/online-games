import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateRoomRequest, RoomListItem } from '@online-games/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
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
}
