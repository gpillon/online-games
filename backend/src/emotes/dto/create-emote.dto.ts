import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEmoteDto {
  @ApiProperty({ example: 'thumbsup', minLength: 1, maxLength: 32 })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  name!: string;
}
