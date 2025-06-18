import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Order } from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import * as QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import { PaymentGateway } from 'src/payment/payment.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';
import { error } from 'src/common/responses';
import { OrderRepository } from './order.repository';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async create(createOrderDto: CreateOrderDto, slipPath?: string) {
    const duplicate = await this.orderRepository.isSeatBooked(
      createOrderDto.seats,
    );
    if (duplicate) {
      throw new HttpException(
        error(
          `Seat ${duplicate} has already been booked.`,
          'Seat already booked',
          undefined,
          HttpStatus.BAD_REQUEST,
        ),
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();
    const order = this.orderRepository.create({
      ...createOrderDto,
      seats: createOrderDto.seats.join(','),
      slipPath,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      status: 'PENDING',
    });

    try {
      const saved = await this.orderRepository.save(order);
      this.paymentGateway.serverToClientOrderCreated(saved);
      return saved;
    } catch (err) {
      this.logger.error('Failed to save order', err);
      throw new HttpException(
        error(
          err.message,
          'Order creation failed',
          undefined,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  findAll() {
    return this.orderRepository.find({ order: { createdAt: 'DESC' } });
  }

  findByOrderId(orderId: string) {
    return this.orderRepository.findByOrderId(orderId);
  }

  updateStatus(id: number, status: OrderStatus) {
    return this.orderRepository.update(id, { status });
  }

  async markAsPaid(id: number, transactionId?: string) {
    await this.orderRepository.update(id, {
      status: 'PAID',
      transactionId,
      paidAt: new Date(),
    });
  }

  async markOrderAsPaid(
    orderId: string,
    data: { transactionId: string; amount: string },
  ) {
    const order = await this.findByOrderId(orderId);
    if (!order) {
      throw new HttpException(
        error('Order not found', 'Order not found', undefined, 404),
        404,
      );
    }
    if (order.status !== 'PENDING') {
      throw new HttpException(
        error(
          `Cannot mark as PAID: current status is ${order.status}`,
          'Invalid status',
          undefined,
          400,
        ),
        400,
      );
    }

    order.status = 'PAID';
    order.transactionId = data.transactionId;
    order.paidAt = new Date();
    return this.orderRepository.save(order);
  }

  save(order: Order) {
    return this.orderRepository.save(order);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredOrders() {
    const now = new Date();
    this.logger.debug('🌀 CRON running at ' + now.toISOString());

    const expiredOrders = await this.orderRepository.findExpired(now);

    if (expiredOrders.length > 0) {
      this.logger.warn(
        `⏰ Found ${expiredOrders.length} expired orders. Cancelling...`,
      );
    }

    for (const order of expiredOrders) {
      order.status = 'CANCELLED';
      await this.orderRepository.save(order);
      this.paymentGateway.serverToClientUpdate(order);
    }
  }

  async getBookedSeats(): Promise<string[]> {
    const orders = await this.orderRepository.find({
      where: [{ status: 'PAID' }, { status: 'PENDING' }],
    });
    return orders.flatMap((order) => order.seats?.split(',') || []);
  }

  async generatePromptpayQRCode(amount: number): Promise<string> {
    const payload = generatePayload('0960415207', { amount });
    return QRCode.toDataURL(payload);
  }
}
