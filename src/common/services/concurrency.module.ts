import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Order } from '../../order/order.entity';
import { User } from '../../user/user.entity';
import { Seat } from '../../seats/seat.entity';
import { SeatBooking } from '../../seats/seat-booking.entity';
import { ConcurrencyService } from './concurrency.service';
import { DuplicateOrderPreventionService } from './duplicate-order-prevention.service';
import { EnhancedOrderService } from './enhanced-order.service';
import { ConcurrencyCleanupService } from './concurrency-cleanup.service';

/**
 * 🛡️ Concurrency Control Module
 * โมดูลสำหรับจัดการ concurrency และป้องกันออเดอร์ซ้ำกัน
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, User, Seat, SeatBooking]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    ConcurrencyService,
    DuplicateOrderPreventionService,
    EnhancedOrderService,
    ConcurrencyCleanupService,
  ],
  exports: [
    ConcurrencyService,
    DuplicateOrderPreventionService,
    EnhancedOrderService,
    ConcurrencyCleanupService,
  ],
})
export class ConcurrencyModule {}
