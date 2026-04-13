import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const username = this.config.get<string>('ADMIN_USERNAME')?.trim();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!username || !password) {
      this.logger.log('ADMIN_USERNAME or ADMIN_PASSWORD not set; skipping admin seed');
      return;
    }
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim() || null;
    await this.usersService.findOrCreateAdmin(username, password, email);
    this.logger.log(`Admin user ensured: ${username}`);
  }
}
