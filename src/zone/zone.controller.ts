import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ZoneService } from './zone.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ApiResponseHelper } from '../common/utils';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Zones')
@ApiBearerAuth()
@Controller('zones')
export class ZoneController {
  constructor(private readonly service: ZoneService) {}

  @Post()
  async create(@Body() dto: CreateZoneDto) {
    const zone = await this.service.create(dto);
    return ApiResponseHelper.success(zone, 'Zone created');
  }

  @Get()
  async findAll() {
    const zones = await this.service.findAll();
    return ApiResponseHelper.success(zones, 'All zones');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const zone = await this.service.findOne(id);
    return ApiResponseHelper.success(zone, 'Zone details');
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    const updated = await this.service.update(id, dto);
    return ApiResponseHelper.success(updated, 'Zone updated');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.service.remove(id);
    return ApiResponseHelper.success(deleted, 'Zone deleted');
  }
}
