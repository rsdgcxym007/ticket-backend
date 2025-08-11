import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from './auth.entity';
import { User } from '../user/user.entity';
import { Staff } from '../staff/staff.entity';
import { UserSession } from './entities/user-session.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionService } from './session.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auth, User, Staff, UserSession]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'myUltraSecretHash123',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(), // สำหรับ cron jobs
    forwardRef(() => UserModule),
  ],
  providers: [AuthService, SessionService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
