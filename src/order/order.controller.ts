// src/order/order.controller.ts
import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Body,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { OrderService } from './order.service';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('slip', {
      storage: diskStorage({
        destination: './uploads/slips',
        filename: (req, file, cb) => {
          const filename = `${uuid()}${extname(file.originalname)}`;
          cb(null, filename);
        },
      }),
    }),
  )
  uploadOrder(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const { zone, seats, total, method } = body;
    const slipPath = file?.filename || null;

    return this.orderService.create(
      {
        zone,
        seats: seats.split(','),
        total: Number(total),
        method,
      },
      slipPath,
    );
  }

  @Get('list')
  findAll() {
    return this.orderService.findAll();
  }

  @Get('qrcode')
  async generateQR(@Query('amount') amount: string) {
    const amt = parseFloat(amount);
    return this.orderService.generatePromptpayQRCode(amt);
  }
  @Get('/qrcode/:amount')
  async getQRCode(@Param('amount') amount: string) {
    const numericAmount = Number(amount);
    const data = await this.orderService.generatePromptpayQRCode(numericAmount);
    return { data };
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: number,
    @Body('status') status: 'APPROVED' | 'REJECTED',
  ) {
    return this.orderService.updateStatus(id, status);
  }
}
