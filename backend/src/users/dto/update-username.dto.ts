import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateUsernameDto {
  @ApiProperty({ example: 'NuovoNome' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username!: string;
}
