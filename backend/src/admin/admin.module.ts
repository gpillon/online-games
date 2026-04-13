import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamesModule } from '../games/games.module';
import { LobbyModule } from '../lobby/lobby.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminSeedService } from './admin-seed.service';

@Module({
  imports: [UsersModule, AuthModule, LobbyModule, GamesModule],
  controllers: [AdminController],
  providers: [AdminSeedService, AdminGuard],
})
export class AdminModule {}
