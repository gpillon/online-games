import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { EmailRateLimitEntity } from './entities/email-rate-limit.entity';

@Injectable()
export class EmailRateLimitService {
  constructor(
    @InjectRepository(EmailRateLimitEntity)
    private readonly repo: Repository<EmailRateLimitEntity>,
  ) {}

  async checkAndRecord(ip: string): Promise<void> {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCount = await this.repo.count({
      where: { ip, createdAt: MoreThan(fiveMinAgo) },
    });
    if (recentCount > 0) {
      throw new HttpException(
        'Please wait 5 minutes between registration attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dailyCount = await this.repo.count({
      where: { ip, createdAt: MoreThan(dayStart) },
    });
    if (dailyCount >= 5) {
      throw new HttpException(
        'Daily registration limit reached (5 per day)',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.repo.save(this.repo.create({ ip }));
  }
}
