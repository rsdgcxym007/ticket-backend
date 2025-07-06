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
import { success } from '../common/responses';
import { RegisterDto } from './dto/register.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);
    return res.json({
      message: 'Login successful',
      ...result,
      token: result.access_token,
    });
  }
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req) {
    const result = await this.authService.register(dto);
    return success(result, 'Register success', req);
  }
  @Get('success')
  getSuccess(@Query('token') token: string) {
    return {
      message: 'Login success redirect!',
      token,
    };
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
    return req.user; // TransformInterceptor จะห่อ response เป็น success()
  }
}
