import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetRoomParamDto {
  @ApiProperty()
  @IsUUID()
  id!: string;
}
