import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';

// ========================================
// 🏗️ CORE MODULES
// ========================================
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { SeatsModule } from './seats/seat.module';
import { ZoneModule } from './zone/zone.module';
import { ReferrerModule } from './referrer/referrer.module';

// ========================================
// 🔧 FEATURE MODULES
// ========================================
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { ConfigModule as ConfigAppModule } from './config/config.module';
// import { NotificationModule } from './notifications/notification.module';
// import { UploadModule } from './upload/upload.module';
// import { OcrModule } from './ocr/ocr.module';
// import { MobileModule } from './mobile/mobile.module';

// ========================================
// 📊 ENTITIES
// ========================================
import { User } from './user/user.entity';
import { Auth } from './auth/auth.entity';
import { Order } from './order/order.entity';
import { Payment } from './payment/payment.entity';
import { Seat } from './seats/seat.entity';
import { SeatBooking } from './seats/seat-booking.entity';
import { Zone } from './zone/zone.entity';
import { Referrer } from './referrer/referrer.entity';
import { AuditLog } from './audit/audit-log.entity';
import { AppConfig } from './config/config.entity';

// ========================================
// 🛠️ SERVICES & CONTROLLERS
// ========================================
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // ========================================
    // 🌐 GLOBAL CONFIGURATION
    // ========================================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // ========================================
    // 🗄️ DATABASE CONNECTION
    // ========================================
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        host: configService.get('DATABASE_HOST'),
        port: parseInt(configService.get('DATABASE_PORT'), 10),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [
          User,
          Auth,
          Order,
          Payment,
          Seat,
          SeatBooking,
          Zone,
          Referrer,
          AuditLog,
          AppConfig,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
        migrations: ['dist/migrations/*.js'],
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),

    // ========================================
    // 🔐 JWT GLOBAL CONFIGURATION
    // ========================================
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '7d'),
        },
      }),
      inject: [ConfigService],
    }),

    // ========================================
    // 🕐 SCHEDULE & CRON JOBS
    // ========================================
    ScheduleModule.forRoot(),

    // ========================================
    // 🛡️ RATE LIMITING
    // ========================================
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: 60000, // Time window in milliseconds
          limit: configService.get('NODE_ENV') === 'production' ? 100 : 1000, // Max requests per window
        },
      ],
      inject: [ConfigService],
    }),

    // ========================================
    // 🏗️ CORE BUSINESS MODULES
    // ========================================
    AuthModule,
    UserModule,
    OrderModule,
    PaymentModule,
    SeatsModule,
    ZoneModule,
    ReferrerModule,
    DashboardModule,
    // ========================================
    // 🔧 FEATURE MODULES
    // ========================================
    AnalyticsModule,
    AuditModule,
    ConfigAppModule,

    // NotificationModule,
    // UploadModule,
    // OcrModule,
    // DashboardModule,
    // MobileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
