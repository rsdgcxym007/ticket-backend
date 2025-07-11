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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return ApiResponseHelper.success(result, 'Login successful');
  }

  @Post('register')
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
}
