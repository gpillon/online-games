import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class HeadToHeadOpponentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsString()
  username!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}
