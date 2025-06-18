import { Controller, Get, Param } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { success, error } from 'src/common/responses';

@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get()
  async getAllSeats() {
    try {
      const data = await this.seatsService.getAllSeats();
      return success(data, 'All seats loaded');
    } catch (err) {
      return error(err.message, 'Failed to load all seats');
    }
  }

  @Get('zone/:zone')
  async getSeatsByZone(@Param('zone') zone: string) {
    try {
      const data = await this.seatsService.getSeatsByZone(zone);
      return success(data, `Seats in zone ${zone}`);
    } catch (err) {
      return error(err.message, 'Failed to load seats by zone');
    }
  }

  @Get('booked')
  async getBookedSeats() {
    try {
      const data = await this.seatsService.getBookedSeats();
      return success(data, 'Booked seats loaded');
    } catch (err) {
      return error(err.message, 'Failed to load booked seats');
    }
  }

  @Get('booked/all')
  async getAllBookedSeats() {
    try {
      const data = await this.seatsService.getAllBookedSeats();
      return success(data, 'All booked seats loaded');
    } catch (err) {
      return error(err.message, 'Failed to load all booked seats');
    }
  }
}
