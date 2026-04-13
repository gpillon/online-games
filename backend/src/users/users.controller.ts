import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from './entities/user.entity';
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

  @Get('leaderboard')
  async leaderboard() {
    return this.usersService.getLeaderboard(100);
  }

  @Get('stats/:userId')
  async stats(@Param('userId') userId: string) {
    return this.usersService.getStatsForUser(userId);
  }
}
