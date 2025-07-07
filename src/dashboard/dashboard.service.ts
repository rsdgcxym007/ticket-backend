import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { Payment } from '../payment/payment.entity';
import { Order } from '../order/order.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Referrer } from '../referrer/referrer.entity';
import { Seat } from '../seats/seat.entity';
import { Zone } from '../zone/zone.entity';
import { User } from '../user/user.entity';
import { ThailandTimeHelper } from '../common/utils/thailand-time.helper';
import { OrderStatus, BookingStatus, TicketType } from '../common/enums';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(SeatBooking) private bookingRepo: Repository<SeatBooking>,
    @InjectRepository(Referrer) private referrerRepo: Repository<Referrer>,
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
    @InjectRepository(Zone) private zoneRepo: Repository<Zone>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  /**
   * แดชบอร์ดหลัก - ข้อมูลสรุปครบถ้วน
   */
  async getDashboardSummary() {
    this.logger.log('🏠 เรียกข้อมูลแดชบอร์ดหลัก');

    const [
      todayReferrerPerformance,
      ticketSalesSummary,
      revenueSummary,
      seatAvailability,
      customerAnalytics,
      systemHealth,
      quickStats,
    ] = await Promise.all([
      this.getTodayReferrerPerformance(),
      this.getTicketSalesSummary(),
      this.getRevenueSummary(),
      this.getSeatAvailabilityByZone(),
      this.getCustomerAnalytics(),
      this.getSystemHealth(),
      this.getQuickStats(),
    ]);

    return {
      quickStats,
      todayReferrers: todayReferrerPerformance,
      ticketSales: ticketSalesSummary,
      revenue: revenueSummary,
      seatAvailability,
      customers: customerAnalytics,
      systemHealth,
      lastUpdated: ThailandTimeHelper.now(),
      timestamp: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
    };
  }

  /**
   * สถิติด่วน - ข้อมูลสำคัญที่ต้องเห็นทันที
   */
  async getQuickStats() {
    this.logger.log('⚡ คำนวณสถิติด่วน');

    const today = ThailandTimeHelper.startOfDay();
    const endOfToday = ThailandTimeHelper.endOfDay();

    // ออเดอร์วันนี้
    const todayOrders = await this.orderRepo.count({
      where: {
        createdAt: Between(today, endOfToday),
      },
    });

    // ออเดอร์ที่ชำระแล้ววันนี้
    const todayPaidOrders = await this.orderRepo.count({
      where: {
        createdAt: Between(today, endOfToday),
        status: OrderStatus.PAID,
      },
    });

    // ออเดอร์รอชำระ
    const pendingOrders = await this.orderRepo.count({
      where: {
        status: OrderStatus.PENDING,
      },
    });

    // ออเดอร์หมดอายุ
    const expiredOrders = await this.orderRepo.count({
      where: {
        status: OrderStatus.EXPIRED,
      },
    });

    // ลูกค้าใหม่วันนี้
    const newCustomersToday = await this.userRepo.count({
      where: {
        createdAt: Between(today, endOfToday),
      },
    });

    return {
      todayOrders,
      todayPaidOrders,
      pendingOrders,
      expiredOrders,
      newCustomersToday,
      successRate:
        todayOrders > 0
          ? ((todayPaidOrders / todayOrders) * 100).toFixed(1)
          : '0',
    };
  }

  /**
   * ยอดผลงาน Referrer วันนี้
   */
  async getTodayReferrerPerformance() {
    this.logger.log('👥 คำนวณยอดผลงาน Referrer วันนี้');

    const today = ThailandTimeHelper.startOfDay();
    const endOfToday = ThailandTimeHelper.endOfDay();

    const todayReferrers = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.referrer', 'referrer')
      .select([
        'referrer.id as referrerId',
        'referrer.name as referrerName',
        'referrer.code as referrerCode',
        'COUNT(order.id) as orderCount',
        'SUM(CASE WHEN order.status = :paidStatus THEN order.totalAmount ELSE 0 END) as totalAmount',
        'SUM(CASE WHEN order.status = :paidStatus THEN order.referrerCommission ELSE 0 END) as totalCommission',
        'COUNT(CASE WHEN order.status = :paidStatus THEN 1 END) as paidOrders',
        'COUNT(CASE WHEN order.status = :pendingStatus THEN 1 END) as pendingOrders',
      ])
      .where('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: today,
        endDate: endOfToday,
      })
      .andWhere('order.referrerId IS NOT NULL')
      .setParameter('paidStatus', OrderStatus.PAID)
      .setParameter('pendingStatus', OrderStatus.PENDING)
      .groupBy('referrer.id')
      .addGroupBy('referrer.name')
      .addGroupBy('referrer.code')
      .orderBy('totalCommission', 'DESC')
      .getRawMany();

    const result = todayReferrers.map((referrer) => ({
      id: referrer.referrerId || referrer.referrerid,
      name: referrer.referrerName || referrer.referrername,
      code: referrer.referrerCode || referrer.referrercode,
      totalOrders: parseInt(referrer.orderCount || referrer.ordercount || 0),
      paidOrders: parseInt(referrer.paidOrders || referrer.paidorders || 0),
      pendingOrders: parseInt(
        referrer.pendingOrders || referrer.pendingorders || 0,
      ),
      totalAmount: parseFloat(
        referrer.totalAmount || referrer.totalamount || 0,
      ),
      totalCommission: parseFloat(
        referrer.totalCommission || referrer.totalcommission || 0,
      ),
      successRate:
        parseInt(referrer.orderCount || 0) > 0
          ? (
              (parseInt(referrer.paidOrders || 0) /
                parseInt(referrer.orderCount || 0)) *
              100
            ).toFixed(1)
          : '0',
    }));

    return {
      date: ThailandTimeHelper.format(today, 'YYYY-MM-DD'),
      referrers: result,
      summary: {
        totalReferrers: result.length,
        totalOrders: result.reduce((sum, r) => sum + r.totalOrders, 0),
        totalPaidOrders: result.reduce((sum, r) => sum + r.paidOrders, 0),
        totalAmount: result.reduce((sum, r) => sum + r.totalAmount, 0),
        totalCommission: result.reduce((sum, r) => sum + r.totalCommission, 0),
      },
    };
  }

  /**
   * สรุปยอดขายตั๋ว - รายวัน รายสัปดาห์ รายเดือน
   */
  async getTicketSalesSummary() {
    this.logger.log('🎫 คำนวณสรุปยอดขายตั๋ว');

    const now = ThailandTimeHelper.now();
    const today = ThailandTimeHelper.startOfDay();
    const endOfToday = ThailandTimeHelper.endOfDay();
    const thisWeekStart = ThailandTimeHelper.startOfWeek();
    const thisMonthStart = ThailandTimeHelper.startOfMonth();

    // ยอดขายวันนี้
    const todayStats = await this.getTicketStatsForPeriod(today, endOfToday);

    // ยอดขายสัปดาห์นี้
    const thisWeekStats = await this.getTicketStatsForPeriod(
      thisWeekStart,
      now,
    );

    // ยอดขายเดือนนี้
    const thisMonthStats = await this.getTicketStatsForPeriod(
      thisMonthStart,
      now,
    );

    // ยอดขายทั้งหมด
    const allTimeStats = await this.getTicketStatsForPeriod(
      ThailandTimeHelper.toThailandTime('2020-01-01'),
      now,
    );

    return {
      today: {
        ...todayStats,
        period: 'วันนี้',
        date: ThailandTimeHelper.format(today, 'YYYY-MM-DD'),
      },
      thisWeek: {
        ...thisWeekStats,
        period: 'สัปดาห์นี้',
        startDate: ThailandTimeHelper.format(thisWeekStart, 'YYYY-MM-DD'),
        endDate: ThailandTimeHelper.format(now, 'YYYY-MM-DD'),
      },
      thisMonth: {
        ...thisMonthStats,
        period: 'เดือนนี้',
        startDate: ThailandTimeHelper.format(thisMonthStart, 'YYYY-MM-DD'),
        endDate: ThailandTimeHelper.format(now, 'YYYY-MM-DD'),
      },
      allTime: {
        ...allTimeStats,
        period: 'ทั้งหมด',
      },
    };
  }

  /**
   * คำนวณสถิติตั๋วในช่วงเวลา
   */
  private async getTicketStatsForPeriod(startDate: Date, endDate: Date) {
    const orders = await this.orderRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['seatBookings'],
    });

    const paidOrders = orders.filter(
      (order) => order.status === OrderStatus.PAID,
    );
    const pendingOrders = orders.filter(
      (order) => order.status === OrderStatus.PENDING,
    );
    const cancelledOrders = orders.filter(
      (order) => order.status === OrderStatus.CANCELLED,
    );

    const totalTickets = orders.reduce(
      (sum, order) => sum + (order.quantity || 0),
      0,
    );
    const paidTickets = paidOrders.reduce(
      (sum, order) => sum + (order.quantity || 0),
      0,
    );
    const pendingTickets = pendingOrders.reduce(
      (sum, order) => sum + (order.quantity || 0),
      0,
    );

    // นับตั๋วแยกตามประเภท
    const ringsideTickets = orders
      .filter((order) => order.ticketType === TicketType.RINGSIDE)
      .reduce((sum, order) => sum + (order.quantity || 0), 0);
    const stadiumTickets = orders
      .filter((order) => order.ticketType === TicketType.STADIUM)
      .reduce((sum, order) => sum + (order.quantity || 0), 0);
    const standingTickets = orders
      .filter((order) => order.ticketType === TicketType.STANDING)
      .reduce((sum, order) => sum + (order.quantity || 0), 0);

    return {
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalTickets,
      paidTickets,
      pendingTickets,
      ringsideTickets,
      stadiumTickets,
      standingTickets,
      successRate:
        orders.length > 0
          ? ((paidOrders.length / orders.length) * 100).toFixed(1)
          : '0',
    };
  }

  /**
   * สรุปยอดรายได้ - แยกตามช่วงเวลาและประเภท
   */
  async getRevenueSummary() {
    this.logger.log('💰 คำนวณสรุปยอดรายได้');

    const now = ThailandTimeHelper.now();
    const today = ThailandTimeHelper.startOfDay();
    const endOfToday = ThailandTimeHelper.endOfDay();
    const thisWeekStart = ThailandTimeHelper.startOfWeek();
    const thisMonthStart = ThailandTimeHelper.startOfMonth();

    // รายได้วันนี้
    const todayRevenue = await this.getRevenueForPeriod(today, endOfToday);

    // รายได้สัปดาห์นี้
    const thisWeekRevenue = await this.getRevenueForPeriod(thisWeekStart, now);

    // รายได้เดือนนี้
    const thisMonthRevenue = await this.getRevenueForPeriod(
      thisMonthStart,
      now,
    );

    // รายได้ทั้งหมด
    const allTimeRevenue = await this.getRevenueForPeriod(
      ThailandTimeHelper.toThailandTime('2020-01-01'),
      now,
    );

    return {
      today: {
        ...todayRevenue,
        period: 'วันนี้',
        date: ThailandTimeHelper.format(today, 'YYYY-MM-DD'),
      },
      thisWeek: {
        ...thisWeekRevenue,
        period: 'สัปดาห์นี้',
        startDate: ThailandTimeHelper.format(thisWeekStart, 'YYYY-MM-DD'),
        endDate: ThailandTimeHelper.format(now, 'YYYY-MM-DD'),
      },
      thisMonth: {
        ...thisMonthRevenue,
        period: 'เดือนนี้',
        startDate: ThailandTimeHelper.format(thisMonthStart, 'YYYY-MM-DD'),
        endDate: ThailandTimeHelper.format(now, 'YYYY-MM-DD'),
      },
      allTime: {
        ...allTimeRevenue,
        period: 'ทั้งหมด',
      },
    };
  }

  /**
   * คำนวณรายได้ในช่วงเวลา
   */
  private async getRevenueForPeriod(startDate: Date, endDate: Date) {
    const paidOrders = await this.orderRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: OrderStatus.PAID,
      },
    });

    // ใช้ Number() เพื่อให้แน่ใจว่าผลลัพธ์เป็นตัวเลขเสมอ
    const grossRevenue = Number(
      paidOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount || 0),
        0,
      ),
    );
    const totalCommission = Number(
      paidOrders.reduce(
        (sum, order) => sum + Number(order.referrerCommission || 0),
        0,
      ),
    );
    const netRevenue = Number(grossRevenue - totalCommission);

    // แยกรายได้ตามประเภทตั๋ว
    const ringsideRevenue = Number(
      paidOrders
        .filter((order) => order.ticketType === TicketType.RINGSIDE)
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    );

    const stadiumRevenue = Number(
      paidOrders
        .filter((order) => order.ticketType === TicketType.STADIUM)
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    );

    const standingRevenue = Number(
      paidOrders
        .filter((order) => order.ticketType === TicketType.STANDING)
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    );

    // แยกค่าคอมมิชชั่นตาม Referrer
    const referrerCommissions = Number(
      paidOrders
        .filter((order) => order.referrerId)
        .reduce((sum, order) => sum + Number(order.referrerCommission || 0), 0),
    );

    const directSalesRevenue = Number(
      paidOrders
        .filter((order) => !order.referrerId)
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    );

    return {
      grossRevenue: parseFloat(grossRevenue.toFixed(2)),
      totalCommission: parseFloat(totalCommission.toFixed(2)),
      netRevenue: parseFloat(netRevenue.toFixed(2)),
      ringsideRevenue: parseFloat(ringsideRevenue.toFixed(2)),
      stadiumRevenue: parseFloat(stadiumRevenue.toFixed(2)),
      standingRevenue: parseFloat(standingRevenue.toFixed(2)),
      referrerCommissions: parseFloat(referrerCommissions.toFixed(2)),
      directSalesRevenue: parseFloat(directSalesRevenue.toFixed(2)),
      orderCount: paidOrders.length,
      averageOrderValue:
        paidOrders.length > 0
          ? parseFloat((grossRevenue / paidOrders.length).toFixed(2))
          : 0,
    };
  }

  /**
   * ข้อมูลที่นั่งว่างแต่ละโซน (กรองที่นั่งที่ seatNumber เป็น null ออก)
   */
  async getSeatAvailabilityByZone(showDate?: string) {
    this.logger.log('💺 คำนวณที่นั่งว่างแต่ละโซน');

    const targetDate = showDate
      ? ThailandTimeHelper.format(
          ThailandTimeHelper.toThailandTime(showDate),
          'YYYY-MM-DD',
        )
      : ThailandTimeHelper.format(ThailandTimeHelper.now(), 'YYYY-MM-DD');

    // ดึงข้อมูลโซนทั้งหมด
    const zones = await this.zoneRepo.find({
      where: { isActive: true },
    });

    const zoneStats = await Promise.all(
      zones.map(async (zone) => {
        const totalSeats = await this.seatRepo.count({
          where: {
            zone: { id: zone.id },
            seatNumber: Not(IsNull()),
          },
        });

        // นับที่นั่งที่จองแล้วในวันที่เลือก
        const bookedSeats = await this.bookingRepo
          .createQueryBuilder('booking')
          .leftJoin('booking.seat', 'seat')
          .leftJoin('seat.zone', 'zone')
          .where('zone.id = :zoneId', { zoneId: zone.id })
          .andWhere('booking.showDate = :showDate', { showDate: targetDate })
          .andWhere('booking.status IN (:...statuses)', {
            statuses: [
              BookingStatus.BOOKED,
              BookingStatus.CONFIRMED,
              BookingStatus.PENDING,
              BookingStatus.PAID,
            ],
          })
          .andWhere('seat.seatNumber IS NOT NULL')
          .getCount();

        // คำนวณที่นั่งว่าง
        const availableSeats = totalSeats - bookedSeats;
        const occupancyRate =
          totalSeats > 0 ? ((bookedSeats / totalSeats) * 100).toFixed(1) : '0';

        return {
          zoneId: zone.id,
          zoneName: zone.name,
          totalSeats,
          bookedSeats,
          availableSeats,
          occupancyRate: parseFloat(occupancyRate),
          status:
            availableSeats === 0
              ? 'เต็ม'
              : availableSeats < 10
                ? 'ใกล้เต็ม'
                : 'ว่าง',
        };
      }),
    );

    // คำนวณสรุปรวม
    const summary = {
      totalSeats: zoneStats.reduce((sum, zone) => sum + zone.totalSeats, 0),
      totalBooked: zoneStats.reduce((sum, zone) => sum + zone.bookedSeats, 0),
      totalAvailable: zoneStats.reduce(
        (sum, zone) => sum + zone.availableSeats,
        0,
      ),
      averageOccupancy:
        zoneStats.length > 0
          ? parseFloat(
              (
                zoneStats.reduce((sum, zone) => sum + zone.occupancyRate, 0) /
                zoneStats.length
              ).toFixed(1),
            )
          : 0,
    };

    return {
      showDate: targetDate,
      zones: zoneStats,
      summary,
      lastUpdated: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
    };
  }

  /**
   * วิเคราะห์ลูกค้า - จำนวนลูกค้าใหม่ ลูกค้าเก่า ความถี่ในการซื้อ
   */
  async getCustomerAnalytics() {
    this.logger.log('👤 วิเคราะห์ข้อมูลลูกค้า');

    const now = ThailandTimeHelper.now();
    const today = ThailandTimeHelper.startOfDay();
    const endOfToday = ThailandTimeHelper.endOfDay();
    const thisWeekStart = ThailandTimeHelper.startOfWeek();
    const thisMonthStart = ThailandTimeHelper.startOfMonth();

    // ลูกค้าใหม่วันนี้
    const newCustomersToday = await this.userRepo.count({
      where: {
        createdAt: Between(today, endOfToday),
      },
    });

    // ลูกค้าใหม่สัปดาห์นี้
    const newCustomersThisWeek = await this.userRepo.count({
      where: {
        createdAt: Between(thisWeekStart, now),
      },
    });

    // ลูกค้าใหม่เดือนนี้
    const newCustomersThisMonth = await this.userRepo.count({
      where: {
        createdAt: Between(thisMonthStart, now),
      },
    });

    // ลูกค้าทั้งหมด
    const totalCustomers = await this.userRepo.count();

    // ลูกค้าที่มีออเดอร์มากกว่า 1 ครั้ง (ลูกค้าประจำ)
    const repeatCustomers = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.userId')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.userId IS NOT NULL')
      .groupBy('order.userId')
      .having('COUNT(order.id) > 1')
      .getCount();

    // ลูกค้าที่ซื้อวันนี้
    const activeCustomersToday = await this.orderRepo
      .createQueryBuilder('order')
      .select('DISTINCT order.userId')
      .where('order.createdAt BETWEEN :start AND :end', {
        start: today,
        end: endOfToday,
      })
      .andWhere('order.userId IS NOT NULL')
      .getCount();

    // อัตราการกลับมาซื้อซ้ำ
    const repeatRate =
      totalCustomers > 0
        ? ((repeatCustomers / totalCustomers) * 100).toFixed(1)
        : '0';

    // ค่าเฉลี่ยออเดอร์ต่อลูกค้า
    const totalOrders = await this.orderRepo.count({
      where: { status: OrderStatus.PAID },
    });
    const avgOrdersPerCustomer =
      totalCustomers > 0 ? (totalOrders / totalCustomers).toFixed(1) : '0';

    return {
      today: {
        newCustomers: newCustomersToday,
        activeCustomers: activeCustomersToday,
      },
      thisWeek: {
        newCustomers: newCustomersThisWeek,
      },
      thisMonth: {
        newCustomers: newCustomersThisMonth,
      },
      summary: {
        totalCustomers,
        repeatCustomers,
        repeatRate: parseFloat(repeatRate),
        avgOrdersPerCustomer: parseFloat(avgOrdersPerCustomer),
      },
      lastUpdated: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
    };
  }

  /**
   * สถานะระบบและการแจ้งเตือนสำคัญ
   */
  async getSystemHealth() {
    this.logger.log('🏥 ตรวจสอบสถานะระบบ');

    const now = ThailandTimeHelper.now();

    // ออเดอร์รอชำระเงิน
    const pendingOrders = await this.orderRepo.count({
      where: { status: OrderStatus.PENDING },
    });

    // ออเดอร์หมดอายุ
    const expiredOrders = await this.orderRepo.count({
      where: { status: OrderStatus.EXPIRED },
    });

    // ออเดอร์ที่ใกล้หมดอายุ (ภายใน 1 ชั่วโมง)
    const soonExpiredOrders = await this.orderRepo.count({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: Between(now, ThailandTimeHelper.add(now, 1, 'hour')),
      },
    });

    // โซนที่ที่นั่งเหลือน้อย (น้อยกว่า 10 ที่)
    const zones = await this.zoneRepo.find({
      where: { isActive: true },
    });

    let lowStockZones = 0;
    for (const zone of zones) {
      const totalSeats = await this.seatRepo.count({
        where: {
          zone: { id: zone.id },
          seatNumber: Not(IsNull()),
        },
      });

      const bookedSeats = await this.bookingRepo
        .createQueryBuilder('booking')
        .leftJoin('booking.seat', 'seat')
        .leftJoin('seat.zone', 'zone')
        .where('zone.id = :zoneId', { zoneId: zone.id })
        .andWhere('booking.status = :status', { status: BookingStatus.BOOKED })
        .getCount();

      const availableSeats = totalSeats - bookedSeats;
      if (availableSeats < 10 && availableSeats > 0) {
        lowStockZones++;
      }
    }

    // สร้างการแจ้งเตือน
    const alerts = [];

    if (soonExpiredOrders > 0) {
      alerts.push({
        type: 'warning',
        message: `มีออเดอร์ ${soonExpiredOrders} รายการที่ใกล้หมดอายุภายใน 1 ชั่วโมง`,
        count: soonExpiredOrders,
      });
    }

    if (pendingOrders > 50) {
      alerts.push({
        type: 'info',
        message: `มีออเดอร์รอชำระจำนวน ${pendingOrders} รายการ`,
        count: pendingOrders,
      });
    }

    if (lowStockZones > 0) {
      alerts.push({
        type: 'warning',
        message: `มี ${lowStockZones} โซนที่เหลือที่นั่งน้อยกว่า 10 ที่`,
        count: lowStockZones,
      });
    }

    if (expiredOrders > 100) {
      alerts.push({
        type: 'error',
        message: `มีออเดอร์หมดอายุจำนวน ${expiredOrders} รายการ ควรทำความสะอาดข้อมูล`,
        count: expiredOrders,
      });
    }

    return {
      pendingOrders,
      expiredOrders,
      soonExpiredOrders,
      lowStockZones,
      alerts,
      systemStatus:
        alerts.length === 0
          ? 'ปกติ'
          : alerts.some((a) => a.type === 'error')
            ? 'ต้องตรวจสอบ'
            : 'เฝ้าระวัง',
      lastUpdated: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
    };
  }

  /**
   * รายงานผลงาน Referrer ทั้งหมด (ไม่จำกัดแค่วันนี้)
   */
  async getReferrerPerformance() {
    this.logger.log('📊 เรียกข้อมูลผลงาน Referrer ทั้งหมด');

    const allReferrers = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.referrer', 'referrer')
      .select([
        'referrer.id as referrerId',
        'referrer.name as referrerName',
        'referrer.code as referrerCode',
        'COUNT(order.id) as totalOrders',
        'COUNT(CASE WHEN order.status = :paidStatus THEN 1 END) as paidOrders',
        'COUNT(CASE WHEN order.status = :pendingStatus THEN 1 END) as pendingOrders',
        'COUNT(CASE WHEN order.status = :cancelledStatus THEN 1 END) as cancelledOrders',
        'SUM(order.totalAmount) as totalAmount',
        'SUM(order.referrerCommission) as totalCommission',
      ])
      .where('order.referrerId IS NOT NULL')
      .setParameters({
        paidStatus: OrderStatus.PAID,
        pendingStatus: OrderStatus.PENDING,
        cancelledStatus: OrderStatus.CANCELLED,
      })
      .groupBy('referrer.id')
      .addGroupBy('referrer.name')
      .addGroupBy('referrer.code')
      .orderBy('totalCommission', 'DESC')
      .getRawMany();

    const result = allReferrers.map((referrer) => ({
      id: referrer.referrerId || referrer.referrerid,
      name: referrer.referrerName || referrer.referrername,
      code: referrer.referrerCode || referrer.referrercode,
      totalOrders: parseInt(referrer.totalOrders || referrer.totalorders || 0),
      paidOrders: parseInt(referrer.paidOrders || referrer.paidorders || 0),
      pendingOrders: parseInt(
        referrer.pendingOrders || referrer.pendingorders || 0,
      ),
      cancelledOrders: parseInt(
        referrer.cancelledOrders || referrer.cancelledorders || 0,
      ),
      totalAmount: parseFloat(
        referrer.totalAmount || referrer.totalamount || 0,
      ),
      totalCommission: parseFloat(
        referrer.totalCommission || referrer.totalcommission || 0,
      ),
      successRate:
        parseInt(referrer.totalOrders || 0) > 0
          ? (
              (parseInt(referrer.paidOrders || 0) /
                parseInt(referrer.totalOrders || 0)) *
              100
            ).toFixed(1)
          : '0',
    }));

    return {
      referrers: result,
      summary: {
        totalReferrers: result.length,
        totalOrders: result.reduce((sum, r) => sum + r.totalOrders, 0),
        totalPaidOrders: result.reduce((sum, r) => sum + r.paidOrders, 0),
        totalAmount: result.reduce((sum, r) => sum + r.totalAmount, 0),
        totalCommission: result.reduce((sum, r) => sum + r.totalCommission, 0),
      },
      lastUpdated: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
    };
  }
}
