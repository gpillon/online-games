import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('email_rate_limits')
export class EmailRateLimitEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  ip!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
