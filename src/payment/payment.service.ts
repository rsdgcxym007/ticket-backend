import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Order, OrderStatus } from '../order/order.entity';
import { Seat } from '../seats/seat.entity';
import { Referrer } from '../referrer/referrer.entity';
import { SeatBooking, BookingStatus } from '../seats/seat-booking.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
    @InjectRepository(Referrer) private referrerRepo: Repository<Referrer>,
    @InjectRepository(SeatBooking) private bookingRepo: Repository<SeatBooking>, // ✅ FIXED!
  ) {}

  async payWithCash(dto: CreatePaymentDto) {
    try {
      console.log('เริ่มดำเนินการ payWithCash', dto);

      const order = await this.orderRepo.findOne({
        where: { id: dto.orderId },
        relations: ['referrer'],
      });

      if (!order) {
        throw new NotFoundException('ไม่พบคำสั่งซื้อ (Order not found)');
      }

      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('คำสั่งซื้อนี้ถูกชำระเงินไปแล้ว');
      }

      if (!order.referrer && dto.referrerCode) {
        const referrer = await this.referrerRepo.findOne({
          where: { code: dto.referrerCode },
        });

        if (!referrer) {
          throw new NotFoundException('ไม่พบผู้แนะนำ (Referrer not found)');
        }

        order.referrer = referrer;
        console.log('ผูก referrer เข้ากับ order:', referrer.code);
      }

      if (dto.customerName) {
        order.customerName = dto.customerName;
        console.log('อัปเดตชื่อผู้สั่ง:', dto.customerName);
      }

      const bookings = await this.bookingRepo.find({
        where: { order: { id: order.id } },
        relations: ['seat'],
      });

      if (!bookings || bookings.length === 0) {
        throw new Error('ไม่มี booking ที่เกี่ยวข้องกับ order นี้');
      }

      console.log(`พบ booking ${bookings.length} รายการ`);

      for (const b of bookings) {
        b.status = BookingStatus.PAID;
      }
      await this.bookingRepo.save(bookings);

      if (order.referrer) {
        const commission = bookings.length * 400;
        order.referrerCommission = commission;

        order.referrer.totalCommission =
          (order.referrer.totalCommission || 0) + commission;

        await this.referrerRepo.save(order.referrer);
        console.log(`เพิ่มค่าคอม ${commission} บาท ให้ referrer`);
      }

      order.status = OrderStatus.PAID;
      await this.orderRepo.save(order);
      console.log('อัปเดตสถานะออเดอร์เป็น PAID');

      const payment = this.paymentRepo.create({
        orderId: order.id,
        amount: dto.amount,
        method: dto.method,
        paidAt: new Date(),
      } as DeepPartial<Payment>);

      const savedPayment = await this.paymentRepo.save(payment);
      console.log('Payment บันทึกแล้ว:', savedPayment.id);

      return savedPayment;
    } catch (err) {
      console.error('Critical Error in payWithCash():', err);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการจ่ายเงิน (${err.name}): ${err.message}`,
      );
    }
  }
}
