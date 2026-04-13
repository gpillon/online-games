import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('game_scores')
export class GameScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, (u) => u.gameScores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'game_type' })
  gameType!: string;

  @Column({ type: 'double precision' })
  points!: number;

  @Column({ default: false })
  won!: boolean;

  @Column({ name: 'game_id' })
  gameId!: string;

  @CreateDateColumn({ name: 'played_at' })
  playedAt!: Date;
}
