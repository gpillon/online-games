import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { GameScoreEntity } from './entities/game-score.entity';
import { HeadToHeadEntity } from './entities/head-to-head.entity';
import { GuestCleanupService } from './guest-cleanup.service';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, GameScoreEntity, HeadToHeadEntity]),
  ],
  providers: [UsersService, GuestCleanupService],
  controllers: [UsersController],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
