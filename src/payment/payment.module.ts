import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { Order } from '../order/order.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { OrderModule } from '../order/order.module';
import { SeatsModule } from '../seats/seat.module';
import { ReferrerModule } from '../referrer/referrer.module';
import { SeatBooking } from '../seats/seat-booking.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { Seat } from '../seats/seat.entity';
import { Referrer } from '../referrer/referrer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Order,
      SeatBooking,
      AuditLog,
      Seat,
      Referrer,
    ]),
    forwardRef(() => OrderModule),
    forwardRef(() => SeatsModule),
    forwardRef(() => ReferrerModule),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService, TypeOrmModule],
})
export class PaymentModule {}
