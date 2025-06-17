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
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { OrderService, OrderStatus } from './order.service';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentGateway } from 'src/payment/payment.gateway';

@Controller('/api/orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  @Post()
  async createOrder(@Body() body: CreateOrderDto) {
    const orderId = `ORDER${Date.now()}`.slice(0, 17);

    const order = await this.orderService.create({
      ...body,
      orderId,
    });

    return {
      message: 'Order created',
      data: order,
    };
  }

  @Patch('/cancel/:orderId')
  async cancelOrder(@Param('orderId') orderId: string) {
    const order = await this.orderService.findByOrderId(orderId);
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'PENDING') {
      order.status = 'CANCELLED';
      await this.orderService.save(order);
    }
    this.paymentGateway.serverToClientUpdate(order);
    return { message: 'Order cancelled', data: order };
  }

  @Get('/seats/booked')
  getBookedSeats() {
    return this.orderService.getBookedSeats();
  }

  /**
   * 🧾 สร้างออเดอร์พร้อมแนบสลิป (optional ใช้ในระบบแนบสลิปเอง)
   */
  @Post('upload')
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
  async uploadOrder(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const { zone, seats, total, method } = body;

    const slipPath = file ? `uploads/slips/${file.filename}` : undefined;
    const orderId = `ORDER${Date.now()}`.slice(0, 17);

    const order = await this.orderService.create(
      {
        orderId,
        zone,
        seats: seats.split(','),
        total: Number(total),
        method,
      },
      slipPath,
    );

    return {
      message: 'Order uploaded',
      data: order,
    };
  }

  /**
   * 📄 รายการทั้งหมด
   */
  @Get('list')
  findAll() {
    return this.orderService.findAll();
  }

  /**
   * 🔄 เปลี่ยนสถานะออเดอร์
   */
  @Patch(':id/status')
  updateStatus(@Param('id') id: number, @Body('status') status: OrderStatus) {
    return this.orderService.updateStatus(id, status);
  }

  /**
   * 🔳 สร้าง QR (PromptPay)
   */
  @Get('qrcode')
  async generateQR(@Query('amount') amount: string) {
    const numericAmount = parseFloat(amount);
    const qr = await this.orderService.generatePromptpayQRCode(numericAmount);
    return { data: qr };
  }

  /**
   * 🔳 สร้าง QR ผ่าน param
   */
  @Get('qrcode/:amount')
  async getQRCode(@Param('amount') amount: string) {
    const numericAmount = parseFloat(amount);
    const qr = await this.orderService.generatePromptpayQRCode(numericAmount);
    return { data: qr };
  }
}
