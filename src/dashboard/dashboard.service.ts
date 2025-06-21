// dashboard.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payment/payment.entity';
import { Order } from '../order/order.entity';
import { BookingStatus, SeatBooking } from 'src/seats/seat-booking.entity';
import { Referrer } from '../referrer/referrer.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(SeatBooking) private bookingRepo: Repository<SeatBooking>,
    @InjectRepository(Referrer) private referrerRepo: Repository<Referrer>,
  ) {}

  async getDashboardData() {
    const today = new Date();
    const currentMonthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );
    const currentMonthEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    );

    this.logger.debug(`📆 Today is ${today.toISOString()}`);
    this.logger.debug(
      `📊 Monthly range: ${currentMonthStart.toISOString()} → ${currentMonthEnd.toISOString()}`,
    );

    const [
      totalSales,
      monthSales,
      totalOrders,
      totalCustomers,
      availableSeats,
      dailySales,
      nextShowDate,
      salesByZone,
      salesByMethod,
      topCustomers,
      topReferrers,
    ] = await Promise.all([
      this.paymentRepo
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'sum')
        .where('payment.status = :status', { status: 'PAID' })
        .getRawOne(),

      this.paymentRepo
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'sum')
        .where('payment.status = :status', { status: 'PAID' })
        .andWhere('payment.createdAt BETWEEN :start AND :end', {
          start: currentMonthStart,
          end: currentMonthEnd,
        })
        .getRawOne(),

      this.orderRepo.count(),

      this.orderRepo
        .createQueryBuilder('order')
        .select('DISTINCT order.customerName')
        .getCount(),

      this.bookingRepo.count({ where: { status: BookingStatus.AVAILABLE } }),

      this.paymentRepo
        .createQueryBuilder('payment')
        .select("DATE_TRUNC('day', payment.createdAt)", 'date')
        .addSelect('SUM(payment.amount)', 'amount')
        .where('payment.status = :status', { status: 'PAID' })
        .groupBy("DATE_TRUNC('day', payment.createdAt)")
        .orderBy('date', 'ASC')
        .getRawMany(),

      this.orderRepo
        .createQueryBuilder('order')
        .select('MIN(order.showDate)', 'date')
        .where('order.showDate >= :today', { today })
        .getRawOne(),

      this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoin('payment.order', 'order')
        .select('order.zone', 'zone')
        .addSelect('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'PAID' })
        .groupBy('order.zone')
        .getRawMany(),

      this.paymentRepo
        .createQueryBuilder('payment')
        .select('payment.method', 'method')
        .addSelect('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'PAID' })
        .groupBy('payment.method')
        .getRawMany(),

      this.orderRepo
        .createQueryBuilder('order')
        .select('order.customerName', 'customer')
        .addSelect('SUM(order.total)', 'spent')
        .groupBy('order.customerName')
        .orderBy('spent', 'DESC')
        .limit(5)
        .getRawMany(),

      this.orderRepo
        .createQueryBuilder('order')
        .leftJoin('order.referrer', 'referrer')
        .select('referrer.code', 'referrer')
        .addSelect('COUNT(order.id)', 'orders')
        .addSelect('SUM(order.referrerCommission)', 'commission')
        .where('order.referrerId IS NOT NULL')
        .groupBy('referrer.code')
        .orderBy('commission', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    const nextDateISO =
      nextShowDate?.date?.toISOString?.() ?? today.toISOString();
    this.logger.debug(`🎯 Next show date: ${nextDateISO}`);

    const [nextShowAvailable, nextShowBooked] = await Promise.all([
      this.bookingRepo.count({
        where: { showDate: nextDateISO, status: BookingStatus.AVAILABLE },
      }),
      this.bookingRepo.count({
        where: { showDate: nextDateISO, status: BookingStatus.BOOKED },
      }),
    ]);

    this.logger.debug(
      `✅ Stats ready: totalSales = ${totalSales.sum}, totalOrders = ${totalOrders}`,
    );

    return {
      totalSales: `฿${totalSales.sum || 0}`,
      monthSales: `${monthSales.sum || 0} บาท`,
      totalOrders,
      totalCustomers,
      availableSeats,
      dailySales: dailySales.map((r) => ({
        date: r.date.toISOString().split('T')[0],
        amount: +r.amount,
      })),
      salesByZone,
      salesByMethod,
      topCustomers,
      topReferrers,
      alerts: [
        'ออเดอร์ล่าสุดชำระแล้ว',
        'เกิดการยกเลิกที่นั่งในโซน front-ringside',
      ],
      nextShowDate: nextDateISO.split('T')[0],
      nextShowAvailable,
      nextShowBooked,
    };
  }
}
