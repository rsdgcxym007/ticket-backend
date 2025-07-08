import {
  Controller,
  UseGuards,
  Post,
  Body,
  Req,
  Get,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { success } from '../common/responses';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto, UpdateSeatStatusDto } from './dto/update-seat.dto';
import { SeatService } from './seat.service';
import { SeatStatus } from '../common/enums';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

@ApiTags('Seats')
@ApiBearerAuth()
@Controller('seats')
@UseGuards(JwtAuthGuard)
export class SeatController {
  constructor(private readonly service: SeatService) {}

  @Post()
  async create(@Body() dto: CreateSeatDto, @Req() req: Request) {
    const result = await this.service.create(dto);
    return success(result, 'Seat created', req);
  }

  @Get()
  async findAll(@Req() req: Request) {
    const result = await this.service.findAll();
    return success(result, 'All seats', req);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const result = await this.service.findById(id);
    return success(result, 'Seat detail', req);
  }

  @Get('by-zone/:zoneId')
  async findByZone(
    @Param('zoneId') zoneId: string,
    @Query('showDate') showDate: string,
    @Req() req: Request,
  ) {
    const result = await this.service.findByZone(zoneId, showDate);
    return success(result, 'Seats by zone', req);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSeatStatusDto,
    @Req() req: Request,
  ) {
    // ⚠️ WARNING: การอัพเดทสถานะที่นั่งตรงๆ ควรใช้เฉพาะกรณี maintenance เท่านั้น
    // สำหรับการจองปกติ ระบบจะใช้ seat_booking table

    // อนุญาตเฉพาะสถานะ maintenance
    const allowedStatuses = [SeatStatus.AVAILABLE, SeatStatus.EMPTY];

    if (!allowedStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Status ${dto.status} is not allowed. Use seat booking system for reservations.`,
      );
    }

    const result = await this.service.updateStatus(id, dto.status);
    return success(result, 'Seat status updated', req);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSeatDto,
    @Req() req: Request,
  ) {
    const result = await this.service.update(id, dto);
    return success(result, 'Seat updated', req);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const result = await this.service.remove(id);
    return success(result, 'Seat deleted', req);
  }
}
