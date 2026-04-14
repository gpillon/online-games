import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EmoteEntity } from './entities/emote.entity';

@Injectable()
export class EmotesService {
  constructor(
    @InjectRepository(EmoteEntity)
    private readonly repo: Repository<EmoteEntity>,
  ) {}

  async listAll(): Promise<EmoteEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async create(name: string, file: Express.Multer.File, userId: string): Promise<EmoteEntity> {
    const ext = this.resolveExtension(file);
    const fileId = uuidv4();
    const filename = `${fileId}${ext}`;
    const publicDir = join(__dirname, '..', '..', 'public', 'emotes');
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(join(publicDir, filename), file.buffer);
    const imageUrl = `/emotes/${filename}`;
    const emote = this.repo.create({
      name,
      imageUrl,
      uploadedBy: userId,
    });
    return this.repo.save(emote);
  }

  private resolveExtension(file: Express.Multer.File): string {
    const fromName = extname(file.originalname).toLowerCase();
    if (fromName && /^\.[a-z0-9]+$/i.test(fromName) && fromName.length <= 8) {
      return fromName;
    }
    const mime = file.mimetype;
    if (mime === 'image/png') return '.png';
    if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
    if (mime === 'image/gif') return '.gif';
    if (mime === 'image/webp') return '.webp';
    return '.png';
  }
}
