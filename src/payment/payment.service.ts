import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Order } from '../order/order.entity';
import { Seat } from '../seats/seat.entity';
import { Referrer } from '../referrer/referrer.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SeatStatus } from 'src/seats/eat-status.enum';
import { PaymentMethod, PaymentStatus } from './payment.entity';
import { OrderStatus } from 'src/order/order.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
    @InjectRepository(Referrer) private referrerRepo: Repository<Referrer>,
  ) {}

  async payWithCash(dto: CreatePaymentDto) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
      relations: ['seats', 'referrer'],
    });

    if (!order) throw new Error('Order not found');

    // ✅ สร้าง Payment
    const payment = this.paymentRepo.create({
      order,
      amount: dto.amount,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
    });
    await this.paymentRepo.save(payment);

    order.status = OrderStatus.PAID;

    if (order.referrerCode && order.referrer) {
      const commissionPerSeat = 400;
      const totalCommission = order.seats.length * commissionPerSeat;

      order.referrerCommission = totalCommission;
      order.referrer.totalCommission += totalCommission;

      await this.referrerRepo.save(order.referrer);
    }

    await this.orderRepo.save(order);

    await this.seatRepo.update(
      order.seats.map((s) => s.id),
      { status: SeatStatus.PAID },
    );

    return payment;
  }
}
