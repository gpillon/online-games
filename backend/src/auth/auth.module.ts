import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalAuthGuard } from './optional-auth.guard';
import { EmailRateLimitEntity } from './entities/email-rate-limit.entity';
import { EmailRateLimitService } from './email-rate-limit.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([EmailRateLimitEntity]),
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRATION') ?? '7d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailRateLimitService,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
    OptionalAuthGuard,
  ],
  exports: [AuthService, JwtModule, PassportModule, OptionalAuthGuard],
})
export class AuthModule {}
