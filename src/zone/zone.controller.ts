import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ZoneService } from './zone.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { Request } from 'express';
import { success } from '../common/responses';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Zones')
@ApiBearerAuth()
@Controller('zones')
export class ZoneController {
  constructor(private readonly service: ZoneService) {}

  @Post()
  async create(@Body() dto: CreateZoneDto, @Req() req: Request) {
    const zone = await this.service.create(dto);
    return success(zone, 'Zone created', req);
  }

  @Get()
  async findAll(@Req() req: Request) {
    const zones = await this.service.findAll();
    return success(zones, 'All zones', req);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const zone = await this.service.findOne(id);
    return success(zone, 'Zone details', req);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
    @Req() req: Request,
  ) {
    const updated = await this.service.update(id, dto);
    return success(updated, 'Zone updated', req);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const deleted = await this.service.remove(id);
    return success(deleted, 'Zone deleted', req);
  }
}
