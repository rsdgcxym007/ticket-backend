import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  Req,
  Query,
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
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status: string,
    @Query('search') search: string,
    @Req() req,
  ) {
    const data = await this.service.findAllWithPagination({
      page: +page,
      limit: +limit,
      status,
      search,
    });
    return success(data, 'Referrers fetched with pagination', req);
  }

  @Get(':id/orders')
  async getOrdersByReferrer(
    @Param('id') id: string,
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const data = await this.service.getReferrerOrders(id, {
      startDate,
      endDate,
    });
    return success(data, 'Orders fetched', req);
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
