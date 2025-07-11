import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileController } from './mobile.controller';
import { Order } from '../order/order.entity';
import { User } from '../user/user.entity';
import { Zone } from '../zone/zone.entity';
import { Seat } from '../seats/seat.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Payment } from '../payment/payment.entity';
import { Referrer } from '../referrer/referrer.entity';
import { MobileService } from './mobile.service';
import { CacheService } from '../common/services/cache.service';

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
  ],
  controllers: [MobileController],
  providers: [MobileService, CacheService],
  exports: [MobileService],
})
export class MobileModule {}
