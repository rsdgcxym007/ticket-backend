import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Payment } from '../payment/payment.entity';
import { Order } from '../order/order.entity';
import { BookingStatus, SeatBooking } from 'src/seats/seat-booking.entity';
import { Referrer } from '../referrer/referrer.entity';
import { Seat } from 'src/seats/seat.entity';
import moment from 'moment';
import dayjs from 'dayjs';
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(SeatBooking) private bookingRepo: Repository<SeatBooking>,
    @InjectRepository(Referrer) private referrerRepo: Repository<Referrer>,
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
  ) {}

  async getDashboardData() {
    const today = new Date();
    const todayISO = dayjs().format('YYYY-MM-DD');
    const currentMonthStart = dayjs().startOf('month');
    const currentMonthEnd = dayjs().endOf('month');
    this.logger.debug(`📆 Today is ${todayISO}`);

    const [
      totalSales,
      monthSales,
      orderStatusCounts,
      totalCustomers,
      dailySales,
      nextShowRaw,
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

      this.orderRepo
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('order.status')
        .getRawMany(),

      this.orderRepo
        .createQueryBuilder('order')
        .select('DISTINCT order.customerName')
        .where('order.status IN (:...statuses)', {
          statuses: ['PAID', 'BOOKED'],
        })
        .andWhere('order.customerName IS NOT NULL')
        .getCount(),

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
        .select('payment.method', 'method')
        .addSelect('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: 'PAID' })
        .groupBy('payment.method')
        .getRawMany(),

      this.orderRepo
        .createQueryBuilder('order')
        .select('order.customerName', 'customer')
        .addSelect('SUM(order.total)', 'spent')
        .where('order.status = :status', { status: 'PAID' })
        .andWhere('order.customerName IS NOT NULL')
        .groupBy('order.customerName')
        .orderBy('spent', 'DESC')
        .limit(5)
        .getRawMany(),

      this.orderRepo
        .createQueryBuilder('order')
        .leftJoin('order.referrer', 'referrer')
        .select('referrer.code', 'referrer')
        .addSelect('referrer.name', 'name')
        .addSelect('COUNT(order.id)', 'orders')
        .addSelect('SUM(order.referrerCommission)', 'referrerCommission')
        .addSelect('SUM(order.standingCommission)', 'standingCommission')
        .addSelect(
          'SUM(order.referrerCommission + order.standingCommission)',
          'commission',
        )
        .where('order.status = :status', { status: 'PAID' })
        .andWhere('order.referrerId IS NOT NULL')
        .groupBy('referrer.code')
        .addGroupBy('referrer.name')
        .orderBy('commission', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    // const totalOrders = await this.orderRepo.count({
    //   where: { status: OrderStatus.PAID },
    // });

    const orderStatusMap = orderStatusCounts.reduce(
      (acc, o) => {
        acc[o.status] = Number(o.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalOrderCount = Object.values(orderStatusMap).reduce(
      (sum: any, n: any) => sum + n,
      0,
    );

    const paidOrders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.payment', 'payment')
      .leftJoinAndSelect('order.seatBookings', 'booking')
      .leftJoinAndSelect('booking.seat', 'seat')
      .leftJoinAndSelect('seat.zone', 'zone')
      .where('order.status = :status', { status: 'PAID' })
      .andWhere('payment.status = :paymentStatus', { paymentStatus: 'PAID' })
      .getMany();

    const salesByZoneMap: Record<string, number> = {};
    for (const order of paidOrders) {
      const amountPerSeat = order.total / order.seatBookings.length;
      for (const booking of order.seatBookings) {
        const zoneName = booking.seat.zone.name;
        salesByZoneMap[zoneName] =
          (salesByZoneMap[zoneName] || 0) + amountPerSeat;
      }
    }

    const salesByZone = Object.entries(salesByZoneMap).map(([zone, total]) => ({
      zone,
      total: Math.round(total),
    }));

    // ✅ แก้ตรงนี้ให้ใช้ DATE() เพื่อเทียบวัน
    //
    //
    // หาวันถัดไป (next show date) ที่มีการเปิดขาย
    console.log('nextShowRaw', nextShowRaw);

    const nextDate =
      nextShowRaw?.date instanceof Date
        ? nextShowRaw.date
        : new Date(nextShowRaw?.date ?? todayISO);

    const nextDateISOs = nextDate.toLocaleDateString('sv-SE'); // ได้ yyyy-mm-dd

    console.log('nextDateISOs', nextDateISOs);

    // ดึง booking ที่ showDate = วันถัดไป และสถานะเป็น BOOKED หรือ PAID
    const nextShowBookings = await this.bookingRepo.find({
      where: {
        showDate: nextDateISOs,
        status: In([BookingStatus.PAID, BookingStatus.BOOKED]),
      },
      relations: ['seat'],
    });

    // seatIds ที่ถูกจองไว้แล้ว
    const bookedSeatId = nextShowBookings.map((b) => b.seat.id);

    // เก้าอี้ทั้งหมด
    const allSeats = await this.seatRepo.find();

    const nextShowAvailable = allSeats.filter(
      (seat) => !bookedSeatId.includes(seat.id),
    ).length;

    const nextShowBooked = nextShowBookings.filter(
      (b) =>
        b.status === BookingStatus.BOOKED || b.status === BookingStatus.PAID,
    ).length;

    //
    //
    //

    const bookedSeatIds = await this.bookingRepo
      .createQueryBuilder('booking')
      .select('DISTINCT booking.seatId', 'seatId')
      .where('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PAID, BookingStatus.BOOKED],
      })
      .andWhere('DATE(booking.showDate) = :today', { today: todayISO })
      .getRawMany();

    const bookedIds = bookedSeatIds.map((s) => s.seatId);
    const availableSeats = await this.seatRepo.count(
      bookedIds.length ? { where: { id: Not(In(bookedIds)) } } : {},
    );

    const nextDateISO = moment(nextShowRaw?.date ?? today).format('YYYY-MM-DD');

    return {
      totalSales: `฿${totalSales.sum || 0}`,
      monthSales: `${monthSales.sum || 0} บาท`,
      totalOrders: totalOrderCount,
      orderStatusCounts: orderStatusMap,
      totalCustomers,
      availableSeats,
      dailySales: dailySales.map((r) => ({
        date: moment(r.date).format('YYYY-MM-DD'),
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
      nextShowDate: nextDateISO,
      nextShowAvailable,
      nextShowBooked,
    };
  }
}
