import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Order } from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import * as QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import { PaymentGateway } from 'src/payment/payment.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';

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
    @InjectRepository(Order) private readonly repo: Repository<Order>,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  /**
   * 📦 สร้างออเดอร์ใหม่ (PENDING)
   */
  // ใน order.service.ts
  async isSeatBooked(seats: string[]): Promise<string | null> {
    const activeOrders = await this.repo
      .createQueryBuilder('order')
      .where('order.status IN (:...statuses)', {
        statuses: ['PENDING', 'PAID'],
      })
      .getMany();

    const allBooked = activeOrders.flatMap((o) => o.seats.split(','));

    const duplicate = seats.find((seat) => allBooked.includes(seat));
    return duplicate || null;
  }

  async create(createOrderDto: CreateOrderDto, slipPath?: string) {
    const duplicate = await this.isSeatBooked(createOrderDto.seats);
    if (duplicate) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Seat ${duplicate} has already been booked.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const order = this.repo.create({
      ...createOrderDto,
      seats: createOrderDto.seats.join(','),
      slipPath,
    });

    return this.repo.save(order);
  }

  /**
   * 📃 ดึงรายการทั้งหมด
   */
  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * 🔎 ค้นหาโดย orderId
   */
  findByOrderId(orderId: string) {
    return this.repo.findOne({ where: { orderId } });
  }

  /**
   * 🔄 เปลี่ยนสถานะออเดอร์
   */
  updateStatus(id: number, status: OrderStatus) {
    return this.repo.update(id, { status });
  }

  /**
   * ✅ ทำเครื่องหมายว่าออเดอร์นี้จ่ายแล้ว
   */
  async markAsPaid(id: number, transactionId?: string) {
    await this.repo.update(id, {
      status: 'PAID',
      transactionId,
      paidAt: new Date(),
    });
  }

  /**
   * ✅ สำหรับ webhook ที่ยิงมาจาก SCB (ใช้ orderId)
   */
  async markOrderAsPaid(
    orderId: string,
    data: { transactionId: string; amount: string },
  ) {
    const order = await this.findByOrderId(orderId);
    if (!order) throw new Error('Order not found');

    if (order.status !== 'PENDING') {
      throw new Error(`Cannot mark as PAID: current status is ${order.status}`);
    }

    order.status = 'PAID';
    order.transactionId = data.transactionId;
    order.paidAt = new Date();

    return this.repo.save(order);
  }

  /**
   * 💾 Save แบบ manual (เช่นหลังแก้ไข)
   */
  save(order: Order) {
    return this.repo.save(order);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredOrders() {
    const expiredTime = new Date(Date.now() - 5 * 60 * 1000); // 5 นาที

    const orders = await this.repo.find({
      where: {
        status: 'PENDING',
        createdAt: LessThan(expiredTime),
      },
    });

    if (orders.length > 0) {
      this.logger.warn(
        `⏰ Found ${orders.length} expired orders. Cancelling...`,
      );
    }

    for (const order of orders) {
      order.status = 'CANCELLED';
      await this.repo.save(order);

      this.paymentGateway.serverToClientUpdate(order); // 🎯 broadcast frontend update
    }
  }

  async getBookedSeats(): Promise<string[]> {
    const orders = await this.repo.find({
      where: [
        { status: 'PAID' },
        { status: 'PENDING' }, // ยังไม่ได้จ่าย แต่กำลังถือที่นั่งอยู่
      ],
    });

    return orders.flatMap((order) => order.seats?.split(',') || []);
  }

  /**
   * 📱 Generate QR PromptPay (0960415207)
   */
  async generatePromptpayQRCode(amount: number): Promise<string> {
    const payload = generatePayload('0960415207', { amount });
    const qr = await QRCode.toDataURL(payload);
    return qr;
  }
}
