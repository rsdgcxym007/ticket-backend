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
import { MulterModule } from '@nestjs/platform-express';
import { UploadModule } from './upload/upload.module';
import { diskStorage } from 'multer';
import path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname); // ✅ แก้ตรงนี้
          const filename = file.fieldname + '-' + uniqueSuffix + ext;
          cb(null, filename);
        },
      }),
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
    UploadModule,
  ],
  providers: [PaymentGateway],
})
export class AppModule {}
