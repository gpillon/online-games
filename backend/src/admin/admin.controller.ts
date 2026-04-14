import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GameStatus } from '@online-games/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GamesService } from '../games/games.service';
import { LobbyService, LobbyRoom } from '../lobby/lobby.service';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AdminGuard } from './admin.guard';
import { AdminListUsersQueryDto } from './dto/admin-list-users-query.dto';
import { AdminStatsResponseDto } from './dto/admin-stats-response.dto';
import { AdminSetEmailDto } from './dto/admin-set-email.dto';
import { AdminSetPasswordDto } from './dto/admin-set-password.dto';
import { AdminUpdateRoleDto } from './dto/admin-update-role.dto';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { AdminUsersPageResponseDto } from './dto/admin-users-page-response.dto';

function toAdminUserDto(user: UserEntity): AdminUserResponseDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? undefined,
    role: user.role,
    isBlocked: user.isBlocked,
    isAnonymous: user.isAnonymous,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly lobbyService: LobbyService,
    private readonly gamesService: GamesService,
  ) {}

  @Get('users')
  @ApiOkResponse({ type: AdminUsersPageResponseDto })
  async listUsers(
    @Query() query: AdminListUsersQueryDto,
  ): Promise<AdminUsersPageResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.usersService.findAll({
      page,
      limit,
      search: query.search,
      role: query.role,
    });
    return {
      items: items.map(toAdminUserDto),
      total,
      page,
      limit,
    };
  }

  @Get('users/:id')
  @ApiOkResponse({ type: AdminUserResponseDto })
  async getUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminUserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toAdminUserDto(user);
  }

  @Patch('users/:id/block')
  @ApiOkResponse({ type: AdminUserResponseDto })
  async blockUser(
    @CurrentUser() admin: UserEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminUserResponseDto> {
    if (id === admin.id) {
      throw new ForbiddenException();
    }
    const user = await this.usersService.blockUser(id);
    return toAdminUserDto(user);
  }

  @Patch('users/:id/unblock')
  @ApiOkResponse({ type: AdminUserResponseDto })
  async unblockUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminUserResponseDto> {
    const user = await this.usersService.unblockUser(id);
    return toAdminUserDto(user);
  }

  @Patch('users/:id/activate')
  @ApiOkResponse({ type: AdminUserResponseDto })
  async activateUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminUserResponseDto> {
    const user = await this.usersService.activateUser(id);
    return toAdminUserDto(user);
  }

  @Patch('users/:id/role')
  @ApiOkResponse({ type: AdminUserResponseDto })
  async updateRole(
    @CurrentUser() admin: UserEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateRoleDto,
  ): Promise<AdminUserResponseDto> {
    if (id === admin.id && dto.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    const user = await this.usersService.updateRole(id, dto.role);
    return toAdminUserDto(user);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async deleteUser(
    @CurrentUser() admin: UserEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    if (id === admin.id) {
      throw new ForbiddenException();
    }
    await this.usersService.deleteUser(id);
  }

  @Patch('users/:id/email')
  @ApiOkResponse({ type: AdminUserResponseDto })
  async setEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminSetEmailDto,
  ): Promise<AdminUserResponseDto> {
    const user = await this.usersService.convertAnonymousToRegistered(
      id,
      dto.email,
    );
    return toAdminUserDto(user);
  }

  @Patch('users/:id/password')
  @ApiOkResponse({ type: AdminUserResponseDto })
  async setPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminSetPasswordDto,
  ): Promise<AdminUserResponseDto> {
    const user = await this.usersService.setPassword(id, dto.password);
    return toAdminUserDto(user);
  }

  @Get('stats')
  @ApiOkResponse({ type: AdminStatsResponseDto })
  async stats(): Promise<AdminStatsResponseDto> {
    const rooms = this.lobbyService.listAllRooms();
    const [
      totalUsers,
      blockedUsersCount,
      adminUsersCount,
    ] = await Promise.all([
      this.usersService.countTotal(),
      this.usersService.countBlocked(),
      this.usersService.countAdmins(),
    ]);
    const waitingRoomsCount = rooms.filter(
      (r) => r.status === GameStatus.WAITING,
    ).length;
    const activeGamesCount = rooms.filter(
      (r) => r.status === GameStatus.IN_PROGRESS,
    ).length;
    const finishedRoomsCount = rooms.filter(
      (r) => r.status === GameStatus.FINISHED,
    ).length;
    return {
      totalUsers,
      blockedUsersCount,
      adminUsersCount,
      totalRooms: rooms.length,
      waitingRoomsCount,
      activeGamesCount,
      finishedRoomsCount,
      runningGameEnginesCount: this.gamesService.getAllEngines().size,
    };
  }

  @Get('rooms')
  @ApiOkResponse({ description: 'All lobby rooms including private' })
  listRooms(): LobbyRoom[] {
    return this.lobbyService.listAllRooms();
  }
}
