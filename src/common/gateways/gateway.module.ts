import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderUpdatesGateway } from './order-updates.gateway';
import { Seat } from '../../seats/seat.entity';

/**
 * 🚀 Gateway Module for WebSocket Real-time Updates
 * โมดูลสำหรับการสื่อสารแบบ real-time ผ่าน WebSocket
 */
@Module({
  imports: [TypeOrmModule.forFeature([Seat])],
  providers: [OrderUpdatesGateway],
  exports: [OrderUpdatesGateway],
})
export class GatewayModule {}
