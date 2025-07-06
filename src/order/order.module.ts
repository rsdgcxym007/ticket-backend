// src/order/order.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './order.entity';
import { UserModule } from '../user/user.module';
import { ReferrerModule } from '../referrer/referrer.module';
import { SeatsModule } from '../seats/seat.module';
import { PaymentModule } from '../payment/payment.module';
import { SeatBooking } from '../seats/seat-booking.entity';
import { BusinessService } from '../common/services/business.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, SeatBooking]),
    SeatsModule,
    UserModule,
    ReferrerModule,
    PaymentModule,
    AuditModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, BusinessService],
  exports: [OrderService, TypeOrmModule],
})
export class OrderModule {}
