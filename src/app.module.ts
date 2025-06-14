// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from './order/order.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
          rejectUnauthorized: false, // ✅ สำหรับ Render.com และ cloud DB ส่วนมาก
        },
      },
    }),
    OrderModule,
    PaymentModule,
  ],
})
export class AppModule {}
