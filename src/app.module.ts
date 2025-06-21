// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from './order/order.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from './payment/payment.module';
import { PaymentGateway } from './payment/payment.gateway';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ZoneModule } from './zone/zone.module';
import { SeatsModule } from './seats/seat.module';
import { ReferrerModule } from './referrer/referrer.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: +process.env.DATABASE_PORT,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true,
      ssl: true, // ✅ เปิด SSL
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
    }),
    OrderModule,
    PaymentModule,
    SeatsModule,
    AuthModule,
    UserModule,
    ZoneModule,
    ReferrerModule,
    DashboardModule,
  ],
  providers: [PaymentGateway],
})
export class AppModule {}
