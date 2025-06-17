// src/seats/seats.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { OrderService } from 'src/order/order.service';

@Controller('seats')
export class SeatsController {
  constructor(
    private readonly seatsService: SeatsService,
    private readonly orderService: OrderService,
  ) {}

  @Get(':zone')
  getSeatsByZone(@Param('zone') zone: string) {
    return this.seatsService.getSeatsByZone(zone);
  }
  @Get('/seats/booked')
  getBookedSeats() {
    return this.orderService.getBookedSeats();
  }

  @Get()
  getAllSeats() {
    return this.seatsService.getAllSeats();
  }

  @Get('/booked/all')
  getAllBookedSeats() {
    return this.seatsService.getBookedSeats();
  }
}
