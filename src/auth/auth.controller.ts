import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { LineAuthGuard } from './guards/line-auth.guard';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponseHelper } from '../common/utils';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ auth: { limit: 5, ttl: 900000 } }) // 5 login attempts per 15 minutes
  async login(@Body() dto: LoginDto, @Req() req: any) {
    // รับ device และ network information
    const deviceInfo = req.get('User-Agent') || 'Unknown Device';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown IP';
    const userAgent = req.get('User-Agent');

    const result = await this.authService.login(
      dto,
      deviceInfo,
      ipAddress,
      userAgent,
    );
    return ApiResponseHelper.success(result, 'Login successful');
  }

  @Post('register')
  @Throttle({ auth: { limit: 3, ttl: 900000 } }) // 3 registration attempts per 15 minutes
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return ApiResponseHelper.success(result, 'Registration successful');
  }
  @Get('success')
  getSuccess(@Query('token') token: string) {
    return ApiResponseHelper.success({ token }, 'Login success redirect!');
  }

  // Google Login
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req, @Res() res: Response) {
    const token = await this.authService.socialLogin(req.user);
    return res.redirect(`/auth/success?token=${token}`);
  }

  // Facebook Login
  @UseGuards(FacebookAuthGuard)
  @Get('facebook')
  facebookLogin() {}

  @UseGuards(FacebookAuthGuard)
  @Get('facebook/callback')
  async facebookCallback(@Req() req, @Res() res: Response) {
    const token = await this.authService.socialLogin(req.user);
    return res.redirect(`/auth/success?token=${token}`);
  }

  // LINE Login
  @UseGuards(LineAuthGuard)
  @Get('line')
  lineLogin() {}

  @UseGuards(LineAuthGuard)
  @Get('line/callback')
  async lineCallback(@Req() req, @Res() res: Response) {
    const token = await this.authService.socialLogin(req.user);
    return res.redirect(`/auth/success?token=${token}`);
  }

  // Protected Profile (JWT)
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return ApiResponseHelper.success(
      req.user,
      'Profile retrieved successfully',
    );
  }

  // Logout from current device
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    const tokenId = req.session?.tokenId;
    if (tokenId) {
      await this.authService.logout(tokenId);
    }
    return ApiResponseHelper.success(null, 'Logout successful');
  }

  // Logout from all devices
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    if (userId) {
      await this.authService.logoutAll(userId);
    }
    return ApiResponseHelper.success(null, 'Logged out from all devices');
  }

  // Get active sessions
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    // Note: SessionService needs to be injected in controller if needed
    return ApiResponseHelper.success([], 'Active sessions retrieved');
  }
}
