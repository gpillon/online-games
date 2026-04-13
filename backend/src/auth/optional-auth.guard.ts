import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      req.user = undefined;
      return true;
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      req.user = undefined;
      return true;
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      const user = await this.usersService.findById(payload.sub);
      req.user = user ?? undefined;
    } catch {
      req.user = undefined;
    }
    return true;
  }
}
