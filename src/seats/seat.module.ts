import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from './seat.entity';
import { SeatBooking } from './seat-booking.entity';
import { SeatService } from './seat.service';
import { SeatController } from './seat.controller';
import { Zone } from '../zone/zone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Seat, SeatBooking, Zone])],
  providers: [SeatService],
  controllers: [SeatController],
  exports: [SeatService, TypeOrmModule],
})
export class SeatsModule {}
