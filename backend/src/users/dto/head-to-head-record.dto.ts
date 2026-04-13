import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { HeadToHeadOpponentDto } from './head-to-head-opponent.dto';

export class HeadToHeadRecordDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  opponentId!: string;

  @ApiProperty()
  @IsString()
  gameType!: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  wins!: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  losses!: number;

  @ApiProperty({ type: HeadToHeadOpponentDto })
  @ValidateNested()
  @Type(() => HeadToHeadOpponentDto)
  opponent!: HeadToHeadOpponentDto;
}
