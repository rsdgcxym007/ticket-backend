import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from './seat.entity';
import { SeatService } from './seat.service';
import { SeatController } from './seat.controller';
import { Zone } from '../zone/zone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Seat, Zone])],
  providers: [SeatService],
  controllers: [SeatController],
  exports: [SeatService, TypeOrmModule],
})
export class SeatsModule {}
