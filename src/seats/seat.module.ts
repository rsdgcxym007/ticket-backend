import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from './seat.entity';
import { SeatBooking } from './seat-booking.entity';
import { SeatService } from './seat.service';
import { SeatController } from './seat.controller';
import { Zone } from '../zone/zone.entity';
import { CacheService } from '../common/services/cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([Seat, SeatBooking, Zone])],
  providers: [SeatService, CacheService],
  controllers: [SeatController],
  exports: [SeatService, TypeOrmModule],
})
export class SeatsModule {}
