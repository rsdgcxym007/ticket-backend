import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    console.log('🔐 JWT Strategy - using secret (first 8 chars):', secret.substring(0, 8) + '...');
    console.log('🔐 JWT_SECRET loaded from environment variables');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log(
      '🔐 JWT Strategy - validating payload:',
      JSON.stringify(payload, null, 2),
    );
    const user = {
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    console.log(
      '🔐 JWT Strategy - returning user:',
      JSON.stringify(user, null, 2),
    );
    return user;
  }
}
