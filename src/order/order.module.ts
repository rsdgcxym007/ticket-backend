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
import { ConcurrencyModule } from '../common/services/concurrency.module';
import { SeatBookingService } from '../common/services/seat-booking.service';
import { OrderBusinessService } from './services/order-business.service';
import { AuditHelperService } from '../common/services/audit-helper.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, SeatBooking]),
    SeatsModule,
    UserModule,
    ReferrerModule,
    PaymentModule,
    AuditModule,
    ConcurrencyModule, // ✅ เพิ่ม ConcurrencyModule
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderBusinessService, // ✅ เพิ่ม OrderBusinessService
    BusinessService,
    SeatBookingService, // ✅ เพิ่ม SeatBookingService
    AuditHelperService, // ✅ เพิ่ม AuditHelperService
  ],
  exports: [OrderService, TypeOrmModule],
})
export class OrderModule {}
