import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { UsersService } from './users.service';

const FIVE_MIN_MS = 5 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GuestCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GuestCleanupService.name);
  private interval?: ReturnType<typeof setInterval>;

  constructor(private readonly usersService: UsersService) {}

  onModuleInit() {
    this.interval = setInterval(() => {
      void this.runCleanup();
    }, FIVE_MIN_MS);
    void this.runCleanup();
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private async runCleanup() {
    try {
      const removed = await this.usersService.deleteStaleGuests(TWENTY_FOUR_HOURS_MS);
      this.logger.log(`Deleted ${removed} stale guest user(s)`);
    } catch (err) {
      this.logger.warn(`Guest cleanup failed: ${String(err)}`);
    }
  }
}
