import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Order } from '../order/order.entity';
import { Payment } from '../payment/payment.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Referrer } from '../referrer/referrer.entity';
import { Seat } from '../seats/seat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Payment, SeatBooking, Referrer, Seat]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
