import { Body, Controller, ForbiddenException, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from './entities/user.entity';
import { HeadToHeadEntity } from './entities/head-to-head.entity';
import { HeadToHeadRecordDto } from './dto/head-to-head-record.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { UserStatsParamDto } from './dto/user-stats-param.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async profile(@CurrentUser() user: UserEntity) {
    const stats = await this.usersService.buildStats(user.id);
    return this.usersService.toProfile(user, stats);
  }

  @Patch('username')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({ type: UpdateUsernameDto })
  @ApiOkResponse({ description: 'Updated user profile' })
  async updateUsername(@CurrentUser() user: UserEntity, @Body() body: UpdateUsernameDto) {
    if (!user.isAnonymous) {
      throw new ForbiddenException('Only anonymous users may change their username');
    }
    const updated = await this.usersService.updateUsername(user.id, body.username);
    const stats = await this.usersService.buildStats(updated.id);
    return this.usersService.toProfile(updated, stats);
  }

  @Get('leaderboard')
  @ApiOkResponse({ description: 'Leaderboard entries' })
  async leaderboard(@Query() query: LeaderboardQueryDto) {
    const limit = query.limit ?? 100;
    return this.usersService.getLeaderboard(limit);
  }

  @Get('stats/:userId')
  @ApiOkResponse({ description: 'User stats by id' })
  async stats(@Param() params: UserStatsParamDto) {
    return this.usersService.getStatsForUser(params.userId);
  }

  @Get('head-to-head')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: [HeadToHeadRecordDto] })
  async headToHead(@CurrentUser() user: UserEntity): Promise<HeadToHeadRecordDto[]> {
    const rows = await this.usersService.getHeadToHead(user.id);
    return rows.map((row) => this.toHeadToHeadRecordDto(row));
  }

  private toHeadToHeadRecordDto(row: HeadToHeadEntity): HeadToHeadRecordDto {
    return {
      id: row.id,
      userId: row.userId,
      opponentId: row.opponentId,
      gameType: row.gameType,
      wins: row.wins,
      losses: row.losses,
      opponent: {
        id: row.opponent.id,
        username: row.opponent.username,
        avatarUrl: row.opponent.avatarUrl ?? undefined,
      },
    };
  }
}
