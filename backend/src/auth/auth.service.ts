import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import type { AuthResponse } from '@online-games/shared';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';
import { EmailRateLimitService } from './email-rate-limit.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailRateLimitService: EmailRateLimitService,
  ) {}

  async register(dto: RegisterDto, ip: string): Promise<AuthResponse> {
    await this.emailRateLimitService.checkAndRecord(ip);

    const recaptchaSecret = this.config.get<string>('RECAPTCHA_SECRET_KEY');
    if (recaptchaSecret) {
      if (!dto.captchaToken) {
        throw new BadRequestException('CAPTCHA verification required');
      }
      await this.verifyRecaptcha(dto.captchaToken, recaptchaSecret);
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }
    const existingName = await this.usersService.findByUsername(dto.username);
    if (existingName) {
      throw new BadRequestException('Username already taken');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const token = this.usersService.generateVerificationToken();
    const user = await this.usersService.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      isEmailVerified: false,
      emailVerificationToken: token,
    });
    await this.sendVerificationEmail(user.email!, token);
    const stats = await this.usersService.buildStats(user.id);
    return this.buildAuthResponse(user, stats);
  }

  async validateCredentials(
    emailOrUsername: string,
    password: string,
  ): Promise<UserEntity | null> {
    let user = await this.usersService.findByEmail(emailOrUsername);
    if (!user) {
      user = await this.usersService.findByUsername(emailOrUsername);
    }
    if (!user || !user.passwordHash) return null;
    if (user.isBlocked) {
      throw new UnauthorizedException('Account is blocked');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(user: UserEntity): Promise<AuthResponse> {
    if (user.isAnonymous) {
      throw new UnauthorizedException('Use anonymous flow for guest accounts');
    }
    const stats = await this.usersService.buildStats(user.id);
    return this.buildAuthResponse(user, stats);
  }

  async anonymous(): Promise<AuthResponse> {
    const suffix = Math.random().toString(36).slice(2, 8);
    const username = `Guest_${suffix}`;
    const randomSecret = await bcrypt.hash(
      `${Date.now()}_${Math.random()}`,
      10,
    );
    const user = await this.usersService.create({
      username,
      email: null,
      passwordHash: randomSecret,
      isAnonymous: true,
      isEmailVerified: false,
      emailVerificationToken: null,
    });
    const stats = await this.usersService.buildStats(user.id);
    return this.buildAuthResponse(user, stats);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token) {
      throw new BadRequestException('Missing token');
    }
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }
    await this.usersService.markEmailVerified(user.id);
    return { message: 'Email verified successfully' };
  }

  async me(user: UserEntity): Promise<AuthResponse> {
    const stats = await this.usersService.buildStats(user.id);
    return this.buildAuthResponse(user, stats);
  }

  private buildAuthResponse(
    user: UserEntity,
    stats: import('@online-games/shared').UserStats,
  ): AuthResponse {
    const accessToken = this.signAccessToken(user);
    return {
      accessToken,
      user: this.usersService.toProfile(user, stats),
    };
  }

  signAccessToken(user: UserEntity): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? undefined,
    };
    return this.jwtService.sign(payload);
  }

  private async sendVerificationEmail(
    to: string,
    token: string,
  ): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = parseInt(this.config.get<string>('SMTP_PORT') ?? '587', 10);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM') ?? 'noreply@example.com';
    const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP not fully configured; skipping verification email. Token: ' +
          token,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const verifyUrl = `${frontend}/verify-email?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
      from,
      to,
      subject: 'Verify your email',
      text: `Click to verify: ${verifyUrl}`,
      html: `<p>Verify your email by <a href="${verifyUrl}">clicking here</a>.</p>`,
    });
  }

  private async verifyRecaptcha(
    token: string,
    secret: string,
  ): Promise<void> {
    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = (await res.json()) as {
      success: boolean;
      score?: number;
      'error-codes'?: string[];
    };
    if (!data.success) {
      this.logger.warn(
        `reCAPTCHA verification failed: ${JSON.stringify(data['error-codes'])}`,
      );
      throw new BadRequestException('CAPTCHA verification failed');
    }
  }
}
