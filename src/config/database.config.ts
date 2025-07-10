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
    return {
      type: 'postgres' as const,
      url: configService.get('DATABASE_URL'),
      host: configService.get('DATABASE_HOST', 'localhost'),
      port: parseInt(configService.get('DATABASE_PORT', '5432'), 10),
      username:
        configService.get('DATABASE_USERNAME') ||
        configService.get('DATABASE_USER', 'postgres'),
      password: configService.get('DATABASE_PASSWORD', 'postgres'),
      database: configService.get('DATABASE_NAME', 'ticket_backend'),
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
      ssl:
        configService.get('DATABASE_SSL') === 'true'
          ? {
              rejectUnauthorized: false,
            }
          : false,
      synchronize:
        configService.get('DATABASE_SYNCHRONIZE', 'false') === 'true' ||
        configService.get('NODE_ENV') !== 'production',
      logging:
        configService.get('DATABASE_LOGGING', 'false') === 'true' ||
        configService.get('NODE_ENV') === 'development',
      dropSchema: configService.get('DATABASE_DROP_SCHEMA', 'false') === 'true',
      autoLoadEntities: true,
      migrations: ['dist/migrations/*{.ts,.js}'],
      migrationsRun: false,
      cli: {
        migrationsDir: 'src/migrations',
      },
    };
  }
}
