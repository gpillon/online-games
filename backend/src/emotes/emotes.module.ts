import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmoteEntity } from './entities/emote.entity';
import { EmotesController } from './emotes.controller';
import { EmotesService } from './emotes.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmoteEntity])],
  controllers: [EmotesController],
  providers: [EmotesService],
})
export class EmotesModule {}
