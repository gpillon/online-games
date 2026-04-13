import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class AdminUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  isBlocked!: boolean;

  @ApiProperty()
  isAnonymous!: boolean;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
