import { ApiProperty } from '@nestjs/swagger';
import { AdminUserResponseDto } from './admin-user-response.dto';

export class AdminUsersPageResponseDto {
  @ApiProperty({ type: [AdminUserResponseDto] })
  items!: AdminUserResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
