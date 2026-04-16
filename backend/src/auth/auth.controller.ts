import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailQueryDto } from './dto/verify-email-query.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    const xf = req.headers['x-forwarded-for'];
    const forwarded =
      typeof xf === 'string'
        ? xf.split(',')[0]?.trim()
        : Array.isArray(xf)
          ? xf[0]
          : undefined;
    const ip = req.ip || forwarded || 'unknown';
    return this.authService.register(dto, ip);
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  login(@Body() _dto: LoginDto, @CurrentUser() user: UserEntity) {
    return this.authService.login(user);
  }

  @Post('anonymous')
  anonymous() {
    return this.authService.anonymous();
  }

  @Get('verify-email')
  verifyEmail(@Query() query: VerifyEmailQueryDto) {
    return this.authService.verifyEmail(query.token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: UserEntity) {
    return this.authService.me(user);
  }
}
