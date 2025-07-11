import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto, UpdateSeatStatusDto } from './dto/update-seat.dto';
import { SeatService } from './seat.service';
import { SeatStatus } from '../common/enums';
import { BadRequestException } from '@nestjs/common';
import { ApiResponseHelper } from '../common/utils';

@ApiTags('Seats')
@ApiBearerAuth()
@Controller('seats')
@UseGuards(JwtAuthGuard)
export class SeatController {
  constructor(private readonly service: SeatService) {}

  @Post()
  async create(@Body() dto: CreateSeatDto) {
    const result = await this.service.create(dto);
    return ApiResponseHelper.success(result, 'Seat created successfully');
  }

  @Get()
  async findAll() {
    const result = await this.service.findAll();
    return ApiResponseHelper.success(result, 'Seats retrieved successfully');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.service.findById(id);
    return ApiResponseHelper.success(result, 'Seat retrieved successfully');
  }

  @Get('by-zone/:zoneId')
  async findByZone(
    @Param('zoneId') zoneId: string,
    @Query('showDate') showDate: string,
  ) {
    const result = await this.service.findByZone(zoneId, showDate);
    return ApiResponseHelper.success(
      result,
      'Seats by zone retrieved successfully',
    );
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSeatStatusDto,
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
    return ApiResponseHelper.success(
      result,
      'Seat status updated successfully',
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSeatDto) {
    const result = await this.service.update(id, dto);
    return ApiResponseHelper.success(result, 'Seat updated successfully');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.service.remove(id);
    return ApiResponseHelper.success(result, 'Seat deleted successfully');
  }
}
