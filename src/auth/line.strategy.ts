import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-line';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LineStrategy extends PassportStrategy(Strategy, 'line') {
  constructor() {
    super({
      channelID: process.env.LINE_CHANNEL_ID,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
      callbackURL: process.env.LINE_CALLBACK_URL,
      scope: ['profile', 'openid', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any,
    done: (err: any, user: any) => void,
  ) {
    done(null, profile);
  }
}
