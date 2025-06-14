// src/order/order.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import * as QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import { PaymentGateway } from 'src/payment/payment.gateway';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly repo: Repository<Order>,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  create(createOrderDto: CreateOrderDto, slipPath?: string) {
    const order = this.repo.create({
      ...createOrderDto,
      seats: createOrderDto.seats.join(','),
      slipPath,
    });
    return this.repo.save(order);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  updateStatus(id: number, status: 'APPROVED' | 'REJECTED') {
    return this.repo.update(id, { status });
  }

  async generatePromptpayQRCode(amount: number): Promise<string> {
    const payload = generatePayload('0960415207', { amount });
    const qr = await QRCode.toDataURL(payload);
    return qr;
  }

  async markOrderAsPaid(orderId: number) {
    await this.repo.update(orderId, { status: 'PAID' });
    this.paymentGateway.notifyPaid(orderId);
  }
}
