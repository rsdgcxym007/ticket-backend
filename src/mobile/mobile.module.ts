import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileController } from './mobile.controller';
import { MobileScannerController } from './mobile-scanner.controller';
import { Order } from '../order/order.entity';
import { User } from '../user/user.entity';
import { Zone } from '../zone/zone.entity';
import { Seat } from '../seats/seat.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Payment } from '../payment/payment.entity';
import { Referrer } from '../referrer/referrer.entity';
import { MobileService } from './mobile.service';
import { QRCodeService } from '../common/services/qr-code.service';
import { CacheService } from '../common/services/cache.service';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      User,
      Zone,
      Seat,
      SeatBooking,
      Payment,
      Referrer,
    ]),
    AuthModule,
    ConfigModule,
  ],
  controllers: [MobileController, MobileScannerController],
  providers: [MobileService, QRCodeService, CacheService],
  exports: [MobileService, QRCodeService],
})
export class MobileModule {}
