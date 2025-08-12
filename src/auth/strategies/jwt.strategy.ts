import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get('JWT_SECRET') || 'myUltraSecretHash123';
    console.log('🔐 JWT Strategy - using secret:', secret);
    console.log('🔐 JWT_SECRET from config:', configService.get('JWT_SECRET'));
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
