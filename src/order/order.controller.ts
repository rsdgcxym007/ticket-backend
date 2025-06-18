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
import { OrderService } from './order.service';
import { OrderStatus } from './order.entity';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentGateway } from 'src/payment/payment.gateway';
import { success, error } from 'src/common/responses';

@Controller('/api/orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    try {
      const orderId = `ORDER${Date.now()}`.slice(0, 17);
      const order = await this.orderService.create({ ...dto, orderId });
      return success(order, 'Order created');
    } catch (err) {
      return error(err.message, 'Order creation failed');
    }
  }

  @Patch('/cancel/:orderId')
  async cancelOrder(@Param('orderId') orderId: string) {
    try {
      const order = await this.orderService.findByOrderId(orderId);
      if (!order) throw new NotFoundException('Order not found');

      if (order.status === 'PENDING') {
        order.status = 'CANCELLED';
        await this.orderService.save(order);
      }
      this.paymentGateway.serverToClientUpdate(order);
      return success(order, 'Order cancelled');
    } catch (err) {
      return error(err.message, 'Cancellation failed');
    }
  }

  @Get('/seats/booked')
  async getBookedSeats() {
    try {
      const data = await this.orderService.getBookedSeats();
      return success(data);
    } catch (err) {
      return error(err.message);
    }
  }

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
    @Body() body: CreateOrderDto,
  ) {
    try {
      const slipPath = file ? `uploads/slips/${file.filename}` : undefined;
      const orderId = `ORDER${Date.now()}`.slice(0, 17);

      const order = await this.orderService.create(
        {
          ...body,
          orderId,
        },
        slipPath,
      );

      return success(order, 'Order uploaded');
    } catch (err) {
      return error(err.message, 'Upload failed');
    }
  }

  @Get('list')
  async findAll() {
    try {
      const data = await this.orderService.findAll();
      return success(data);
    } catch (err) {
      return error(err.message);
    }
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') orderId: string,
    @Body('status') status: OrderStatus,
  ) {
    try {
      const order = await this.orderService.findByOrderId(orderId);
      if (!order) throw new NotFoundException('Order not found');

      if (order.status === 'PENDING') {
        order.status = status;
        await this.orderService.save(order);
      }
      return success(order, 'Status updated');
    } catch (err) {
      return error(err.message, 'Update failed');
    }
  }

  @Get('qrcode')
  async generateQR(@Query('amount') amount: string) {
    try {
      const qr = await this.orderService.generatePromptpayQRCode(
        parseFloat(amount),
      );
      return success(qr);
    } catch (err) {
      return error(err.message);
    }
  }

  @Get('qrcode/:amount')
  async getQRCode(@Param('amount') amount: string) {
    try {
      const qr = await this.orderService.generatePromptpayQRCode(
        parseFloat(amount),
      );
      return success(qr);
    } catch (err) {
      return error(err.message);
    }
  }
}
