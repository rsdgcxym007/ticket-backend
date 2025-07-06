import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Order } from '../order/order.entity';
import { Payment } from '../payment/payment.entity';
import { Referrer } from '../referrer/referrer.entity';
import { SeatBooking } from '../seats/seat-booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Payment, Referrer, SeatBooking])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
