import {
  Controller,
  Post,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { success } from 'src/common/responses';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const data = await this.orderService.create(dto);
    return success(data, 'Order created', req);
  }

  @Patch('change-seats/:id')
  changeSeats(@Param('id') id: string, @Body('seatIds') seatIds: string[]) {
    return this.orderService.changeSeats(id, seatIds);
  }

  @Get()
  async findAll(@Req() req: Request) {
    const data = await this.orderService.findAll();
    return success(data, 'All orders', req);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: Request) {
    const data = await this.orderService.findById(id);
    return success(data, 'Order detail', req);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @Req() req: Request,
  ) {
    const data = await this.orderService.update(id, dto);
    return success(data, 'Order updated', req);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const data = await this.orderService.remove(id);
    return success(data, 'Order deleted', req);
  }
}
