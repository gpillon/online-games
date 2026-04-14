import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('emotes')
export class EmoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'image_url' })
  imageUrl!: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader!: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
