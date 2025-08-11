import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { AdvancedAnalyticsController } from './advanced-analytics.controller';
import { RealTimeMonitoringService } from './real-time-monitoring.service';
import { RealTimeMonitoringController } from './real-time-monitoring.controller';
import { Order } from '../order/order.entity';
import { Seat } from '../seats/seat.entity';
import { Payment } from '../payment/payment.entity';
import { AuditLog } from '../audit/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Seat, Payment, AuditLog]),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AdvancedAnalyticsController, RealTimeMonitoringController],
  providers: [AdvancedAnalyticsService, RealTimeMonitoringService],
  exports: [AdvancedAnalyticsService, RealTimeMonitoringService],
})
export class AdvancedAnalyticsModule {}
