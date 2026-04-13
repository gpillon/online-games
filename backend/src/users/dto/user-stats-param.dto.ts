import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UserStatsParamDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;
}
