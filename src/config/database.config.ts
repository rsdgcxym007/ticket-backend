import { ConfigService } from '@nestjs/config';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';
import { Order } from '../order/order.entity';
import { Payment } from '../payment/payment.entity';
import { Seat } from '../seats/seat.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Zone } from '../zone/zone.entity';
import { Referrer } from '../referrer/referrer.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { AppConfig } from './config.entity';

export class DatabaseConfigHelper {
  static getConfig(configService: ConfigService) {
    const nodeEnv = configService.get('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';
    const isTest = nodeEnv === 'test';

    // Base configuration
    const config: any = {
      type: 'postgres' as const,
      host: configService.get('DATABASE_HOST', 'localhost'),
      port: parseInt(configService.get('DATABASE_PORT', '5432'), 10),
      username:
        configService.get('DATABASE_USERNAME') ||
        configService.get('DATABASE_USER', 'postgres'),
      password: configService.get('DATABASE_PASSWORD', 'postgres'),
      database: configService.get(
        'DATABASE_NAME',
        isTest ? 'test_db' : 'ticket_backend',
      ),
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
      autoLoadEntities: true,
      migrations: ['dist/migrations/*{.ts,.js}'],
      migrationsRun: false,
      cli: {
        migrationsDir: 'src/migrations',
      },
    };

    // SSL Configuration - AWS RDS requires SSL
    const databaseHost = configService.get('DATABASE_HOST', 'localhost');
    const isAwsRds = databaseHost.includes('.rds.amazonaws.com');
    const sslSetting = configService.get('DATABASE_SSL');

    if (
      isAwsRds ||
      sslSetting === 'true' ||
      (isProduction && sslSetting !== 'false')
    ) {
      config.ssl = {
        rejectUnauthorized: false,
        ca: false,
        checkServerIdentity: false,
      };

      // For AWS RDS, also add extra SSL config
      if (isAwsRds) {
        config.extra = {
          ssl: {
            rejectUnauthorized: false,
          },
        };
      }
    } else if (isTest || sslSetting === 'false') {
      config.ssl = false;
    }

    // Synchronization (only for development and test)
    config.synchronize =
      isTest ||
      configService.get('DATABASE_SYNCHRONIZE', 'false') === 'true' ||
      (!isProduction && configService.get('DATABASE_SYNCHRONIZE') !== 'false');

    // Logging
    config.logging =
      configService.get('DATABASE_LOGGING', 'false') === 'true' ||
      (!isProduction && !isTest);

    // Test specific settings
    if (isTest) {
      config.dropSchema =
        configService.get('DATABASE_DROP_SCHEMA', 'true') === 'true';
      config.keepConnectionAlive = true;
    }

    // Use connection URL if provided (for services like Heroku)
    const databaseUrl = configService.get('DATABASE_URL');
    if (databaseUrl) {
      config.url = databaseUrl;
      // Remove individual connection params when using URL
      delete config.host;
      delete config.port;
      delete config.username;
      delete config.password;
      delete config.database;
    }

    return config;
  }
}
