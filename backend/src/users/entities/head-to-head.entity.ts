import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('head_to_head')
export class HeadToHeadEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'opponent_id', type: 'uuid' })
  opponentId!: string;

  @Column({ name: 'game_type' })
  gameType!: string;

  @Column({ default: 0 })
  wins!: number;

  @Column({ default: 0 })
  losses!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opponent_id' })
  opponent!: UserEntity;
}
