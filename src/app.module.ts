// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from './order/order.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from './payment/payment.module';
import { SeatsModule } from './seats/seats.module';
import { PaymentGateway } from './payment/payment.gateway';
import { ScheduleModule } from '@nestjs/schedule';
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
  ],
  providers: [PaymentGateway],
})
export class AppModule {}
