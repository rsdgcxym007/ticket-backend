import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  Res,
  Header,
  NotFoundException,
} from '@nestjs/common';
import { ReferrerService } from './referrer.service';
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { UpdateReferrerDto } from './dto/update-referrer.dto';
import { ApiResponseHelper } from '../common/utils';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from '../order/order.service';
import { Response } from 'express';

@ApiTags('Referrers')
@ApiBearerAuth()
@Controller('referrers')
export class ReferrerController {
  constructor(
    private readonly service: ReferrerService,
    private readonly orderService: OrderService,
  ) {}

  @Post()
  async create(@Body() dto: CreateReferrerDto) {
    const data = await this.service.create(dto);
    return ApiResponseHelper.success(data, 'Referrer created');
  }

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status: string,
    @Query('search') search: string,
  ) {
    const data = await this.service.findAllWithPagination({
      page: +page,
      limit: +limit,
      status,
      search,
    });
    return ApiResponseHelper.success(data, 'Referrers fetched with pagination');
  }

  @Get(':id/orders')
  async getOrdersByReferrer(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const data = await this.service.getReferrerOrders(id, {
      startDate,
      endDate,
    });
    return ApiResponseHelper.success(data, 'Orders fetched');
  }

  @Get(':id/export-pdf')
  async exportReferrerPdf(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateReferrerPdf(
      id,
      startDate,
      endDate,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=referrer-report-${startDate}_to_${endDate}.pdf`,
    );
    // ปรับ CORS ให้รองรับ credentials และ whitelist origin
    const allowedOrigins = [
      'http://43.229.133.51:3000',
      'http://localhost:3000',
    ];
    const reqOrigin = (res.req as any)?.headers?.origin;
    if (allowedOrigins.includes(reqOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.send(buffer);
  }

  @Get(':id/preview-pdf')
  @Header('Content-Type', 'application/pdf')
  async previewReferrerPdf(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateReferrerPdf(
      id,
      startDate,
      endDate,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="referrer.pdf"');
    // ปรับ CORS ให้รองรับ credentials และ whitelist origin
    const allowedOrigins = [
      'http://43.229.133.51:3000',
      'http://localhost:3000',
    ];
    const reqOrigin = (res.req as any)?.headers?.origin;
    if (allowedOrigins.includes(reqOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.send(buffer);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return ApiResponseHelper.success(data, 'Referrer detail');
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateReferrerDto) {
    const data = await this.service.update(id, dto);
    return ApiResponseHelper.success(data, 'Referrer updated');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.service.remove(id);
    return ApiResponseHelper.success(data, 'Referrer deleted');
  }

  @Get(':orderId/thermal-receipt')
  async previewThermalReceipt(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    // ดึง tickets จาก orderService.generateTickets
    // NOTE: ต้องระบุ userId (เช่น จาก req.user.id หรือ null ถ้าไม่ใช้ auth)
    // ดึง userId จาก order
    // ใช้ public method ใน OrderService เพื่อดึง order
    const order = await this.orderService.getOrderById(orderId);
    const userId = order ? order.userId : null;
    if (!userId) throw new NotFoundException('Order or user not found');
    const result = await this.orderService.generateTickets(orderId, userId);
    if (!result || !result.tickets)
      throw new NotFoundException('Order not found');

    const buffer = await this.service.generateThermalReceiptPdf(result.tickets);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="thermal-receipt.pdf"',
    );
    const allowedOrigins = [
      'http://43.229.133.51:3000',
      'http://localhost:3000',
    ];
    const reqOrigin = (res.req as any)?.headers?.origin;
    if (allowedOrigins.includes(reqOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.send(buffer);
  }
}
