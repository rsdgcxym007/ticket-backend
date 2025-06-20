import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import { ReferrerService } from './referrer.service';
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { UpdateReferrerDto } from './dto/update-referrer.dto';
import { success } from 'src/common/responses';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Referrers')
@ApiBearerAuth()
@Controller('referrers')
export class ReferrerController {
  constructor(private readonly service: ReferrerService) {}

  @Post()
  async create(@Body() dto: CreateReferrerDto, @Req() req) {
    const data = await this.service.create(dto);
    return success(data, 'Referrer created', req);
  }

  @Get()
  async findAll(@Req() req) {
    const data = await this.service.findAll();
    return success(data, 'All referrers', req);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const data = await this.service.findOne(id);
    return success(data, 'Referrer detail', req);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReferrerDto,
    @Req() req,
  ) {
    const data = await this.service.update(id, dto);
    return success(data, 'Referrer updated', req);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const data = await this.service.remove(id);
    return success(data, 'Referrer deleted', req);
  }
}
