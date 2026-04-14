import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GamesModule } from '../games/games.module';
import { UsersModule } from '../users/users.module';
import { LobbyRoomEntity } from './entities/lobby-room.entity';
import { LobbyController } from './lobby.controller';
import { LobbyGateway } from './lobby.gateway';
import { LobbyPersistenceService } from './lobby-persistence.service';
import { LobbyService } from './lobby.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LobbyRoomEntity]),
    GamesModule,
    UsersModule,
    AuthModule,
    ConfigModule,
  ],
  controllers: [LobbyController],
  providers: [LobbyService, LobbyGateway, LobbyPersistenceService],
  exports: [LobbyService],
})
export class LobbyModule {}
