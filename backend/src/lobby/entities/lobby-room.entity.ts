import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('lobby_rooms')
export class LobbyRoomEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('jsonb')
  roomData!: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  engineState!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
