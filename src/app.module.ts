import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseConfigHelper } from './config/database.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit/audit-log.entity';
import { AuditHelper } from './common/utils';

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

import { PerformanceModule } from './performance/performance.module';
import { TasksModule } from './tasks/tasks.module';

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
// 📊 ENTITIES (moved to database.config.ts)
// ========================================

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
      useFactory: (configService: ConfigService) =>
        DatabaseConfigHelper.getConfig(configService),
      inject: [ConfigService],
    }),

    // Global TypeORM for AuditHelper
    TypeOrmModule.forFeature([AuditLog]),

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
    PerformanceModule,
    TasksModule,

    // NotificationModule,
    // UploadModule,
    // OcrModule,
    // DashboardModule,
    // MobileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async onModuleInit() {
    // Initialize AuditHelper with repository
    AuditHelper.setRepository(this.auditRepo);
  }
}
