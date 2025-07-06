import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Payment } from '../payment/payment.entity';
import { Order } from '../order/order.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Referrer } from '../referrer/referrer.entity';
import { Seat } from '../seats/seat.entity';
import moment from 'moment';
import dayjs from 'dayjs';
import { BookingStatus, OrderStatus } from '../common/enums';
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

  // ========================================
  // 📊 ADDITIONAL DASHBOARD METHODS
  // ========================================
  async getStatistics() {
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const weekStart = dayjs().startOf('week').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [todayOrders, weekOrders, monthOrders] = await Promise.all([
      this.orderRepo.count({
        where: {
          createdAt: { $gte: todayStart, $lte: todayEnd } as any,
        },
      }),
      this.orderRepo.count({
        where: {
          createdAt: { $gte: weekStart } as any,
        },
      }),
      this.orderRepo.count({
        where: {
          createdAt: { $gte: monthStart } as any,
        },
      }),
    ]);

    return {
      today: { orders: todayOrders },
      week: { orders: weekOrders },
      month: { orders: monthOrders },
    };
  }

  async getRevenueAnalytics(period: string = 'weekly') {
    const startDate = dayjs().subtract(7, 'days').toDate();

    const revenueData = await this.paymentRepo
      .createQueryBuilder('payment')
      .select("DATE_TRUNC('day', payment.createdAt)", 'period')
      .addSelect('SUM(payment.amount)', 'revenue')
      .where('payment.status = :status', { status: 'PAID' })
      .andWhere('payment.createdAt >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', payment.createdAt)")
      .orderBy('period', 'ASC')
      .getRawMany();

    return {
      period,
      revenueData: revenueData.map((r) => ({
        period: r.period,
        revenue: parseFloat(r.revenue) || 0,
      })),
    };
  }

  async getSeatOccupancy(showDate?: string) {
    const targetDate = showDate ? new Date(showDate) : new Date();
    const dateStr = dayjs(targetDate).format('YYYY-MM-DD');

    const [totalSeats, bookedSeats] = await Promise.all([
      this.seatRepo.count(),
      this.bookingRepo
        .createQueryBuilder('booking')
        .where('DATE(booking.showDate) = :date', { date: dateStr })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.PAID, BookingStatus.BOOKED],
        })
        .getCount(),
    ]);

    const occupancyRate = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

    return {
      showDate: dateStr,
      totalSeats,
      bookedSeats,
      availableSeats: totalSeats - bookedSeats,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
    };
  }

  async getPerformanceMetrics() {
    const last30Days = dayjs().subtract(30, 'days').toDate();

    const [totalOrders, paidOrders] = await Promise.all([
      this.orderRepo.count({
        where: {
          createdAt: { $gte: last30Days } as any,
        },
      }),
      this.orderRepo.count({
        where: {
          status: OrderStatus.CONFIRMED,
          createdAt: { $gte: last30Days } as any,
        },
      }),
    ]);

    const conversionRate =
      totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      paidOrders,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  async getReferrerAnalytics() {
    const topReferrers = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.referrer', 'referrer')
      .select('referrer.code', 'referrerCode')
      .addSelect('referrer.name', 'referrerName')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .addSelect('SUM(order.totalAmount)', 'totalRevenue')
      .where('order.referrerId IS NOT NULL')
      .andWhere('order.status = :status', { status: OrderStatus.CONFIRMED })
      .groupBy('referrer.code')
      .addGroupBy('referrer.name')
      .orderBy('totalRevenue', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      topReferrers: topReferrers.map((r) => ({
        code: r.referrerCode,
        name: r.referrerName,
        totalOrders: parseInt(r.totalOrders) || 0,
        totalRevenue: parseFloat(r.totalRevenue) || 0,
      })),
    };
  }

  async getRecentActivities() {
    const [recentOrders, recentPayments] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('order')
        .select([
          'order.id',
          'order.orderNumber',
          'order.customerName',
          'order.totalAmount',
          'order.status',
          'order.createdAt',
        ])
        .orderBy('order.createdAt', 'DESC')
        .limit(10)
        .getMany(),

      this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoin('payment.order', 'order')
        .select([
          'payment.id',
          'payment.amount',
          'payment.method',
          'payment.status',
          'payment.createdAt',
          'order.orderNumber',
        ])
        .orderBy('payment.createdAt', 'DESC')
        .limit(10)
        .getMany(),
    ]);

    return {
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      })),
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
      })),
    };
  }

  async getAlerts() {
    const alerts = [];
    const last24Hours = dayjs().subtract(24, 'hours').toDate();

    // ตรวจสอบออเดอร์ที่ยกเลิกมากผิดปกติ
    const cancellationsLast24h = await this.orderRepo.count({
      where: {
        status: OrderStatus.CANCELLED,
        updatedAt: { $gte: last24Hours } as any,
      },
    });

    if (cancellationsLast24h > 5) {
      alerts.push({
        type: 'warning',
        message: `มีการยกเลิกออเดอร์ ${cancellationsLast24h} รายการใน 24 ชั่วโมงที่ผ่านมา`,
        timestamp: new Date(),
      });
    }

    // ตรวจสอบความจุที่นั่ง
    const todayOccupancy = await this.getSeatOccupancy();
    if (todayOccupancy.occupancyRate > 80) {
      alerts.push({
        type: 'info',
        message: `อัตราการใช้ที่นั่งวันนี้ ${todayOccupancy.occupancyRate}% - ใกล้เต็มแล้ว`,
        timestamp: new Date(),
      });
    }

    return {
      alerts,
      count: alerts.length,
    };
  }
}
