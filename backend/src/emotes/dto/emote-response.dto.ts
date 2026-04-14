import { ApiProperty } from '@nestjs/swagger';

export class EmoteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '/emotes/550e8400-e29b-41d4-a716-446655440000.png' })
  imageUrl!: string;

  @ApiProperty({ format: 'uuid' })
  uploadedBy!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
