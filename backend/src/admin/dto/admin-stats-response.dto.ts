import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsResponseDto {
  @ApiProperty()
  totalUsers!: number;

  @ApiProperty()
  blockedUsersCount!: number;

  @ApiProperty()
  adminUsersCount!: number;

  @ApiProperty()
  totalRooms!: number;

  @ApiProperty()
  waitingRoomsCount!: number;

  @ApiProperty()
  activeGamesCount!: number;

  @ApiProperty()
  finishedRoomsCount!: number;

  @ApiProperty()
  runningGameEnginesCount!: number;
}
