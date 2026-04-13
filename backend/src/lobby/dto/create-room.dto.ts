import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameType } from '@online-games/shared';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name!: string;

  @ApiProperty({ enum: GameType })
  @IsEnum(GameType)
  gameType!: GameType;

  @ApiProperty({ minimum: 2, maximum: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(4)
  numPlayers!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  modeId!: string;

  @ApiProperty()
  @IsBoolean()
  isPrivate!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}
