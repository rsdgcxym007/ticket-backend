import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../order/order.entity';
import { User } from '../user/user.entity';
import { Zone } from '../zone/zone.entity';
import { Seat } from '../seats/seat.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Payment } from '../payment/payment.entity';
import { Referrer } from '../referrer/referrer.entity';
import { ThailandTimeHelper } from '../common/utils/thailand-time.helper';
import { OrderStatus, SeatStatus } from '../common/enums';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class MobileService {
  private readonly logger = new Logger(MobileService.name);

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Zone) private zoneRepo: Repository<Zone>,
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
    @InjectRepository(SeatBooking) private bookingRepo: Repository<SeatBooking>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Referrer) private referrerRepo: Repository<Referrer>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * หน้าแรกของแอปมือถือ - ข้อมูลสำคัญ
   */
  async getMobileHomeData(userId?: string) {
    this.logger.log('📱 เรียกข้อมูลหน้าแรกแอปมือถือ');

    const [zones, recentOrders, announcements] = await Promise.all([
      this.getAvailableZones(),
      userId ? this.getRecentUserOrders(userId) : [],
      this.getSystemAnnouncements(),
    ]);

    return {
      zones,
      recentOrders,
      announcements,
      showInfo: {
        date: ThailandTimeHelper.format(ThailandTimeHelper.now(), 'YYYY-MM-DD'),
        venue: 'Patong Boxing Stadium',
        nextShowTime: '20:00',
      },
      lastUpdated: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
    };
  }

  /**
   * รายการโซนที่มีที่นั่งว่าง - Cached Version
   */
  async getAvailableZones() {
    const cacheKey = 'available_zones';
    const cached = this.cacheService.get(cacheKey);

    if (cached) {
      this.logger.debug('Using cached available zones data');
      return cached;
    }

    const zones = await this.zoneRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    // ใช้ Raw Query เพื่อความเร็ว
    const zoneAvailability = await Promise.all(
      zones.map(async (zone) => {
        // Cache สำหรับแต่ละ Zone
        const zoneCacheKey = this.cacheService.getZoneDataKey(zone.id);
        const cachedZone = this.cacheService.get(zoneCacheKey);

        if (cachedZone) {
          return cachedZone;
        }

        // Raw Query เร็วกว่า ORM
        const [seatStats] = await this.seatRepo.query(
          `
          SELECT 
            COUNT(*) as total_seats,
            COUNT(*) FILTER (WHERE sb.id IS NULL) as available_seats
          FROM seat s
          LEFT JOIN seat_booking sb ON s.id = sb.seat_id 
            AND sb.status IN ('PENDING', 'CONFIRMED', 'PAID')
          WHERE s.zone_id = $1
        `,
          [zone.id],
        );

        const totalSeats = parseInt(seatStats.total_seats);
        const availableSeats = parseInt(seatStats.available_seats);
        const bookedSeats = totalSeats - availableSeats;

        const result = {
          id: zone.id,
          name: zone.name,
          totalSeats,
          availableSeats,
          occupancyRate:
            totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0,
          status:
            availableSeats === 0
              ? 'sold_out'
              : availableSeats < 10
                ? 'limited'
                : 'available',
        };

        // Cache ข้อมูล Zone
        this.cacheService.setZoneData(zone.id, result);
        return result;
      }),
    );

    // Cache ผลรวม
    this.cacheService.set(cacheKey, zoneAvailability, 30 * 1000); // 30 วินาที
    return zoneAvailability;
  }

  /**
   * ออเดอร์ล่าสุดของผู้ใช้
   */
  async getRecentUserOrders(userId: string) {
    return await this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['seatBookings', 'payment'],
    });
  }

  /**
   * ประกาศของระบบ
   */
  async getSystemAnnouncements() {
    return [
      {
        id: '1',
        title: '🥊 การแข่งขันมวยไทยประจำสัปดาห์',
        message: 'ศึกมวยไทยสุดมันส์ ทุกวันพุธ เสาร์ เวลา 20:00 น.',
        type: 'info',
        priority: 'high',
      },
      {
        id: '2',
        title: '💰 โปรโมชั่นจองล่วงหน้า',
        message: 'จองล่วงหน้า 7 วัน รับส่วนลด 15%',
        type: 'promotion',
        priority: 'medium',
      },
    ];
  }

  /**
   * รายละเอียดโซนสำหรับมือถือ
   */
  async getMobileZoneDetails(zoneId: string) {
    const zone = await this.zoneRepo.findOne({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new Error('ไม่พบโซนที่ระบุ');
    }

    const seats = await this.seatRepo.find({
      where: { zone: { id: zoneId } },
      order: { rowIndex: 'ASC', columnIndex: 'ASC' },
    });

    // สร้าง seat map สำหรับมือถือ (แบบง่าย)
    const seatMap = this.createMobileSeatMap(seats, zone.seatMap);

    const stats = {
      totalSeats: seats.length,
      availableSeats: seats.filter((s) => s.status === SeatStatus.AVAILABLE)
        .length,
      bookedSeats: seats.filter((s) => s.status === SeatStatus.BOOKED).length,
    };

    return {
      zone: {
        id: zone.id,
        name: zone.name,
      },
      seatMap,
      stats,
      pricing: await this.getZonePricing(),
    };
  }

  /**
   * สร้าง seat map ที่เหมาะสำหรับมือถือ
   */
  private createMobileSeatMap(seats: Seat[], originalMap: string[][]) {
    // แปลง seat map ให้เหมาะกับหน้าจอมือถือ
    return originalMap.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        const seat = seats.find(
          (s) => s.rowIndex === rowIndex && s.columnIndex === colIndex,
        );

        return {
          type: cell,
          status: seat?.status || 'empty',
          seatId: seat?.id,
          seatNumber: seat?.seatNumber,
        };
      }),
    );
  }

  /**
   * ข้อมูลราคาโซน
   */
  async getZonePricing() {
    // ในอนาคตอาจมีราคาแบบไดนามิก
    return {
      regular: 1500,
      vip: 2000,
      currency: 'THB',
    };
  }

  /**
   * ประวัติการซื้อของผู้ใช้ (มือถือ)
   */
  async getMobileUserHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const orders = await this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['seatBookings', 'payment'],
    });

    const total = await this.orderRepo.count({ where: { userId } });

    return {
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        quantity: order.quantity,
        createdAt: order.createdAt,
        showDate: order.showDate,
        paymentStatus: order.payment?.status,
        seats: order.seatBookings?.map((booking) => ({
          seatNumber: booking.seat?.seatNumber,
          zoneName: booking.seat?.zone?.name,
        })),
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * QR Code สำหรับตั๋ว
   */
  async generateTicketQR(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ['seatBookings', 'payment'],
    });

    if (!order || order.status !== OrderStatus.PAID) {
      throw new Error('ไม่พบออเดอร์หรือยังไม่ได้ชำระเงิน');
    }

    // สร้างข้อมูล QR Code
    const qrData = {
      orderId: order.id,
      userId: order.userId,
      showDate: order.showDate,
      seats: order.seatBookings?.map((b) => b.seat?.seatNumber),
      amount: order.totalAmount,
      timestamp: Date.now(),
    };

    // ในโปรเจกต์จริงควรเข้ารหัสข้อมูลนี้
    const qrString = Buffer.from(JSON.stringify(qrData)).toString('base64');

    return {
      qrCode: qrString,
      orderInfo: {
        orderId: order.id,
        showDate: order.showDate,
        totalAmount: order.totalAmount,
        seats: order.seatBookings?.map((b) => ({
          seatNumber: b.seat?.seatNumber,
          zone: b.seat?.zone?.name,
        })),
      },
    };
  }

  /**
   * ตรวจสอบสถานะออเดอร์สำหรับมือถือ
   */
  async checkMobileOrderStatus(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ['payment', 'seatBookings'],
    });

    if (!order) {
      throw new Error('ไม่พบออเดอร์');
    }

    const timeLeft = order.expiresAt
      ? Math.max(0, Math.floor((order.expiresAt.getTime() - Date.now()) / 1000))
      : 0;

    return {
      orderId: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      timeLeft,
      canPay: order.status === OrderStatus.PENDING && timeLeft > 0,
      canCancel: order.status === OrderStatus.PENDING,
      paymentInfo: order.payment
        ? {
            status: order.payment.status,
            method: order.payment.method,
            paidAt: order.payment.createdAt,
          }
        : null,
    };
  }

  /**
   * สถิติสำหรับผู้ใช้มือถือ
   */
  async getMobileUserStats(userId: string) {
    const [totalOrders, totalSpent, favoriteZone] = await Promise.all([
      this.orderRepo.count({
        where: { userId, status: OrderStatus.PAID },
      }),
      this.getTotalUserSpending(userId),
      this.getUserFavoriteZone(userId),
    ]);

    return {
      totalOrders,
      totalSpent,
      favoriteZone,
      memberSince: await this.getUserJoinDate(userId),
    };
  }

  private async getTotalUserSpending(userId: string) {
    const result = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .getRawOne();

    return parseFloat(result?.total || 0);
  }

  private async getUserFavoriteZone(userId: string) {
    const result = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoin('booking.seat', 'seat')
      .leftJoin('seat.zone', 'zone')
      .leftJoin('booking.order', 'order')
      .select('zone.name', 'zoneName')
      .addSelect('COUNT(*)', 'count')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .groupBy('zone.id')
      .addGroupBy('zone.name')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    return result?.zoneName || 'ไม่มีข้อมูล';
  }

  private async getUserJoinDate(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['createdAt'],
    });

    return user?.createdAt || null;
  }

  /**
   * 🏠 ข้อมูลหน้าหลักแอปมือถือ
   */
  async getHomeData() {
    this.logger.log('🏠 ดึงข้อมูลหน้าหลักแอปมือถือ');

    const [announcements, promotions, upcomingEvents, quickStats] =
      await Promise.all([
        this.getSystemAnnouncements(),
        this.getActivePromotions(),
        this.getUpcomingEvents(),
        this.getQuickStats(),
      ]);

    return {
      announcements,
      promotions,
      upcomingEvents,
      quickStats,
      lastUpdated: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
    };
  }

  /**
   * 📢 โปรโมชั่นที่ใช้งานได้
   */
  async getActivePromotions() {
    return [
      {
        id: '1',
        title: '🎉 ส่วนลดการจองล่วงหน้า',
        description: 'จองล่วงหน้า 7 วัน รับส่วนลด 15%',
        discountPercent: 15,
        validUntil: ThailandTimeHelper.format(
          ThailandTimeHelper.add(ThailandTimeHelper.now(), 30, 'day'),
          'YYYY-MM-DD',
        ),
        imageUrl: '/images/promotion-early-bird.jpg',
        terms: [
          'ใช้ได้กับการจองล่วงหน้า 7 วัน',
          'ไม่สามารถใช้ร่วมกับส่วนลดอื่นได้',
        ],
      },
      {
        id: '2',
        title: '🥊 ส่วนลดสำหรับสมาชิก VIP',
        description: 'สมาชิก VIP รับส่วนลดพิเศษ 20%',
        discountPercent: 20,
        validUntil: ThailandTimeHelper.format(
          ThailandTimeHelper.add(ThailandTimeHelper.now(), 60, 'day'),
          'YYYY-MM-DD',
        ),
        imageUrl: '/images/promotion-vip.jpg',
        terms: ['เฉพาะสมาชิก VIP', 'ใช้ได้ทุกประเภทตั๋ว'],
      },
    ];
  }

  /**
   * 📅 กิจกรรมที่จะมาถึง
   */
  async getUpcomingEvents() {
    const today = ThailandTimeHelper.now();
    const nextWeek = ThailandTimeHelper.add(today, 7, 'day');

    return [
      {
        id: '1',
        title: '🥊 ศึกมวยไทยประจำสัปดาห์',
        eventDate: ThailandTimeHelper.format(nextWeek, 'YYYY-MM-DD'),
        eventTime: '20:00',
        venue: 'Patong Boxing Stadium',
        ticketPrice: 1500,
        availableSeats: 350,
        totalSeats: 500,
        description: 'การแข่งขันมวยไทยสุดมันส์ กับนักมวยชื่อดัง',
        poster: '/images/event-poster-1.jpg',
      },
      {
        id: '2',
        title: '🏆 ศึกแชมป์เปี้ยนชิพ',
        eventDate: ThailandTimeHelper.format(
          ThailandTimeHelper.add(today, 14, 'day'),
          'YYYY-MM-DD',
        ),
        eventTime: '19:00',
        venue: 'Patong Boxing Stadium',
        ticketPrice: 2000,
        availableSeats: 200,
        totalSeats: 500,
        description: 'ชิงแชมป์ระดับประเทศ',
        poster: '/images/event-poster-2.jpg',
      },
    ];
  }

  /**
   * 📊 สถิติด่วน
   */
  async getQuickStats() {
    const totalSeats = await this.seatRepo.count();
    const bookedSeats = await this.bookingRepo.count();
    const availableSeats = totalSeats - bookedSeats;

    const zones = await this.zoneRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return {
      totalEvents: 2,
      totalSeats,
      availableSeats,
      popularZones: zones.slice(0, 3).map((z) => z.name),
      occupancyRate:
        totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0,
    };
  }

  /**
   * 🎫 รายละเอียดโซนที่นั่ง
   */
  async getZoneDetails(zoneId: string, eventDate: string) {
    this.logger.log(`📍 ดึงรายละเอียดโซน ${zoneId} วันที่ ${eventDate}`);

    const zone = await this.zoneRepo.findOne({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new Error('ไม่พบโซนที่ระบุ');
    }

    const seats = await this.seatRepo.find({
      where: { zone: { id: zoneId } },
      order: { rowIndex: 'ASC', columnIndex: 'ASC' },
    });

    const bookedSeats = await this.bookingRepo.count({
      where: {
        seat: { zone: { id: zoneId } },
        showDate: eventDate,
      },
    });

    const totalSeats = seats.length;
    const availableSeats = totalSeats - bookedSeats;

    return {
      id: zone.id,
      name: zone.name,
      description: 'โซนที่นั่งคุณภาพ',
      price: 1500,
      totalSeats,
      availableSeats,
      bookedSeats,
      occupancyRate:
        totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0,
      seatMap: await this.generateSeatMap(zoneId, eventDate),
      features: ['ที่นั่งสบาย', 'มุมมองดี', 'เสียงชัดเจน', 'แสงสว่างเพียงพอ'],
      policies: [
        'ไม่อนุญาตให้นำอาหารและเครื่องดื่มเข้าไป',
        'ต้องมาถึงล่วงหน้าก่อนเวลา 30 นาที',
        'ห้ามสูบบุหรี่',
        'ห้ามใช้แฟลชถ่ายรูป',
      ],
    };
  }

  /**
   * 🗺️ แผนผังที่นั่ง
   */
  async getSeatMap(zoneId: string, eventDate: string) {
    this.logger.log(`🗺️ ดึงแผนผังที่นั่งโซน ${zoneId} วันที่ ${eventDate}`);

    const zone = await this.zoneRepo.findOne({
      where: { id: zoneId },
    });

    if (!zone) {
      throw new Error('ไม่พบโซนที่ระบุ');
    }

    const seats = await this.seatRepo.find({
      where: { zone: { id: zoneId } },
      order: { rowIndex: 'ASC', columnIndex: 'ASC' },
    });

    const bookedSeats = await this.bookingRepo.find({
      where: {
        seat: { zone: { id: zoneId } },
        showDate: eventDate,
      },
      relations: ['seat'],
    });

    const bookedSeatIds = bookedSeats.map((b) => b.seat.id);

    const seatMap = seats.map((seat) => ({
      id: seat.id,
      row: seat.rowIndex,
      column: seat.columnIndex,
      seatNumber: seat.seatNumber,
      status: bookedSeatIds.includes(seat.id) ? 'booked' : 'available',
      price: 1500,
      isPremium: false,
    }));

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      seatMap: {
        rows: [...new Set(seats.map((s) => s.rowIndex))].sort(),
        columns: [...new Set(seats.map((s) => s.columnIndex))].sort(
          (a, b) => a - b,
        ),
        seats: seatMap,
        legend: {
          available: 'ที่นั่งว่าง',
          booked: 'ที่นั่งถูกจอง',
          occupied: 'ที่นั่งไม่ว่าง',
          unavailable: 'ที่นั่งไม่พร้อมใช้งาน',
          premium: 'ที่นั่งพรีเมี่ยม',
        },
      },
    };
  }

  /**
   * 👤 ออเดอร์ของผู้ใช้
   */
  async getUserOrders(userId: string) {
    this.logger.log(`👤 ดึงออเดอร์ของผู้ใช้ ${userId}`);

    const orders = await this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['seatBookings', 'payment'],
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber || `ORDER-${order.id.slice(-6)}`,
      status: order.status,
      totalAmount: order.totalAmount,
      ticketType: order.ticketType,
      eventDate: order.showDate,
      seatDetails:
        order.seatBookings?.map((booking) => ({
          zoneName: booking.seat?.zone?.name || 'ไม่ระบุ',
          seatNumber: booking.seat?.seatNumber || 'ไม่ระบุ',
          price: 1500,
        })) || [],
      qrCode: null,
      createdAt: ThailandTimeHelper.formatDateTime(order.createdAt),
      paymentMethod: order.payment?.method || null,
      paymentStatus: order.payment?.status || null,
    }));
  }

  /**
   * 📋 ประวัติการใช้งาน
   */
  async getUserHistory(userId: string) {
    this.logger.log(`📋 ดึงประวัติการใช้งานของผู้ใช้ ${userId}`);

    const totalOrders = await this.orderRepo.count({
      where: { userId, status: OrderStatus.PAID },
    });

    const totalSpent = await this.getTotalUserSpending(userId);
    const favoriteZone = await this.getUserFavoriteZone(userId);

    const recentOrders = await this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['seatBookings', 'payment'],
    });

    const totalEvents = await this.orderRepo
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.showDate)', 'count')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .getRawOne();

    return {
      totalOrders,
      totalSpent,
      totalEvents: parseInt(totalEvents?.count || '0'),
      favoriteZones: [favoriteZone].filter(Boolean),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber || `ORDER-${order.id.slice(-6)}`,
        eventDate: order.showDate,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: ThailandTimeHelper.formatDateTime(order.createdAt),
      })),
    };
  }

  /**
   * 🔍 สถานะออเดอร์
   */
  async getOrderStatus(orderId: string, userId: string) {
    this.logger.log(`🔍 ตรวจสอบสถานะออเดอร์ ${orderId}`);

    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ['payment', 'seatBookings'],
    });

    if (!order) {
      throw new Error('ไม่พบออเดอร์ที่ระบุ');
    }

    const statusMapping = {
      [OrderStatus.PENDING]: 'รอดำเนินการ',
      [OrderStatus.PENDING_SLIP]: 'รอตรวจสอบสลิป',
      [OrderStatus.PAID]: 'ชำระเงินแล้ว',
      [OrderStatus.CANCELLED]: 'ยกเลิก',
      [OrderStatus.EXPIRED]: 'หมดอายุ',
    };

    const timeline = [
      {
        status: 'created',
        timestamp: ThailandTimeHelper.formatDateTime(order.createdAt),
        description: 'สร้างออเดอร์',
      },
    ];

    if (order.payment) {
      timeline.push({
        status: 'payment',
        timestamp: ThailandTimeHelper.formatDateTime(order.payment.createdAt),
        description: 'ชำระเงิน',
      });
    }

    if (order.status === OrderStatus.PAID) {
      timeline.push({
        status: 'confirmed',
        timestamp: ThailandTimeHelper.formatDateTime(
          order.payment?.createdAt || order.createdAt,
        ),
        description: 'ยืนยันการจอง',
      });
    }

    const nextAction = this.getNextAction(order);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber || `ORDER-${order.id.slice(-6)}`,
      status: order.status,
      statusText: statusMapping[order.status] || 'ไม่ทราบสถานะ',
      paymentStatus: order.payment?.status || null,
      paymentMethod: order.payment?.method || null,
      totalAmount: order.totalAmount,
      eventDate: order.showDate,
      timeline,
      nextAction,
    };
  }

  /**
   * 📱 QR Code สำหรับออเดอร์
   */
  async getOrderQR(orderId: string, userId: string) {
    this.logger.log(`📱 สร้าง QR Code สำหรับออเดอร์ ${orderId}`);

    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId, status: OrderStatus.PAID },
      relations: ['seatBookings', 'payment'],
    });

    if (!order) {
      throw new Error('ไม่พบออเดอร์ที่ชำระเงินแล้ว');
    }

    const qrData = {
      orderId: order.id,
      userId: order.userId,
      showDate: order.showDate,
      seats:
        order.seatBookings?.map((b) => b.seat?.seatNumber).filter(Boolean) ||
        [],
      amount: order.totalAmount,
      timestamp: Date.now(),
    };

    const qrCode = Buffer.from(JSON.stringify(qrData)).toString('base64');
    const qrCodeUrl = `data:image/png;base64,${qrCode}`;

    return {
      orderId: order.id,
      qrCode,
      qrCodeUrl,
      expiresAt: ThailandTimeHelper.formatDateTime(
        ThailandTimeHelper.add(ThailandTimeHelper.now(), 1, 'day'),
      ),
      instructions: [
        'แสดง QR Code นี้ที่จุดเข้างาน',
        'QR Code นี้จะหมดอายุหลังจากใช้งานแล้ว',
        'กรุณามาถึงล่วงหน้าก่อนเวลา 30 นาที',
        'ห้ามแชร์ QR Code ให้ผู้อื่น',
      ],
    };
  }

  /**
   * 📊 สถิติผู้ใช้
   */
  async getUserStats(userId: string) {
    this.logger.log(`📊 ดึงสถิติผู้ใช้ ${userId}`);

    const totalOrders = await this.orderRepo.count({
      where: { userId, status: OrderStatus.PAID },
    });

    const totalSpent = await this.getTotalUserSpending(userId);
    const favoriteZone = await this.getUserFavoriteZone(userId);

    const currentMonth = ThailandTimeHelper.startOfMonth(
      ThailandTimeHelper.now(),
    );
    const nextMonth = ThailandTimeHelper.add(currentMonth, 1, 'month');

    const monthlyStats = await this.orderRepo.find({
      where: {
        userId,
        status: OrderStatus.PAID,
        createdAt: Between(currentMonth, nextMonth),
      },
    });

    const totalEvents = await this.orderRepo
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.showDate)', 'count')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .getRawOne();

    return {
      totalOrders,
      totalSpent,
      totalEvents: parseInt(totalEvents?.count || '0'),
      currentMonth: {
        orders: monthlyStats.length,
        spent: monthlyStats.reduce(
          (sum, order) => sum + (order.totalAmount || 0),
          0,
        ),
        events: [...new Set(monthlyStats.map((o) => o.showDate))].length,
      },
      favoriteZones: [favoriteZone].filter(Boolean),
      membershipLevel: this.calculateMembershipLevel(totalSpent),
      pointsEarned: Math.floor(totalSpent * 0.01), // 1 point per 1 baht
      pointsAvailable: Math.floor(totalSpent * 0.01), // simplified
      achievements: this.calculateAchievements(totalOrders, totalSpent),
    };
  }

  /**
   * 📢 ประกาศและข่าวสาร
   */
  async getAnnouncements(type?: string) {
    this.logger.log(
      `📢 ดึงประกาศและข่าวสาร ${type ? `ประเภท ${type}` : 'ทั้งหมด'}`,
    );

    const announcements = [
      {
        id: '1',
        title: '🥊 การแข่งขันมวยไทยประจำสัปดาห์',
        content:
          'ศึกมวยไทยสุดมันส์ ทุกวันพุธ เสาร์ เวลา 20:00 น. ที่ Patong Boxing Stadium',
        type: 'INFO',
        priority: 'HIGH',
        isActive: true,
        showUntil: ThailandTimeHelper.format(
          ThailandTimeHelper.add(ThailandTimeHelper.now(), 30, 'day'),
          'YYYY-MM-DD',
        ),
        createdAt: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
        imageUrl: '/images/boxing-announcement.jpg',
        actionUrl: '/events/weekly-boxing',
      },
      {
        id: '2',
        title: '💰 โปรโมชั่นจองล่วงหน้า',
        content: 'จองล่วงหน้า 7 วัน รับส่วนลด 15% สำหรับการจองผ่านแอปพลิเคชัน',
        type: 'PROMOTION',
        priority: 'MEDIUM',
        isActive: true,
        showUntil: ThailandTimeHelper.format(
          ThailandTimeHelper.add(ThailandTimeHelper.now(), 60, 'day'),
          'YYYY-MM-DD',
        ),
        createdAt: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
        imageUrl: '/images/promotion-early-bird.jpg',
        actionUrl: '/promotions/early-bird',
      },
      {
        id: '3',
        title: '🚧 ปรับปรุงระบบชำระเงิน',
        content:
          'ขออภัยในความไม่สะดวก เราจะปรับปรุงระบบชำระเงินในวันที่ 15 มกราคม เวลา 02:00-04:00 น.',
        type: 'MAINTENANCE',
        priority: 'HIGH',
        isActive: true,
        showUntil: ThailandTimeHelper.format(
          ThailandTimeHelper.add(ThailandTimeHelper.now(), 7, 'day'),
          'YYYY-MM-DD',
        ),
        createdAt: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
        imageUrl: '/images/maintenance.jpg',
        actionUrl: null,
      },
    ];

    if (type) {
      return announcements.filter((a) => a.type === type.toUpperCase());
    }

    return announcements;
  }

  /**
   * 📝 อัปเดตโปรไฟล์ผู้ใช้
   */
  async updateUserProfile(userId: string, updateData: any) {
    this.logger.log(`📝 อัปเดตโปรไฟล์ผู้ใช้ ${userId}`);

    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('ไม่พบผู้ใช้ที่ระบุ');
    }

    await this.userRepo.update(userId, {
      ...updateData,
      updatedAt: ThailandTimeHelper.now(),
    });

    const updatedUser = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'updatedAt'],
    });

    return {
      success: true,
      message: 'อัปเดตโปรไฟล์สำเร็จ',
      user: updatedUser,
    };
  }

  /**
   * 🔔 ตั้งค่าการแจ้งเตือน
   */
  async updateNotificationSettings(userId: string, settings: any) {
    this.logger.log(`🔔 ตั้งค่าการแจ้งเตือนผู้ใช้ ${userId}`);

    // ในโปรเจกต์จริงควรมีตาราง user_notification_settings
    // ที่นี่เราจะจำลองการบันทึก
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('ไม่พบผู้ใช้ที่ระบุ');
    }

    // สมมติว่าเราบันทึก settings ใน user.preferences
    await this.userRepo.update(userId, {
      updatedAt: ThailandTimeHelper.now(),
    });

    return {
      success: true,
      message: 'ตั้งค่าการแจ้งเตือนสำเร็จ',
      settings,
    };
  }

  /**
   * 🗺️ สร้างแผนผังที่นั่ง
   */
  private async generateSeatMap(zoneId: string, eventDate: string) {
    const seats = await this.seatRepo.find({
      where: { zone: { id: zoneId } },
      order: { rowIndex: 'ASC', columnIndex: 'ASC' },
    });

    const bookedSeats = await this.bookingRepo.find({
      where: {
        seat: { zone: { id: zoneId } },
        showDate: eventDate,
      },
      relations: ['seat'],
    });

    const bookedSeatIds = bookedSeats.map((b) => b.seat.id);

    return {
      totalSeats: seats.length,
      availableSeats: seats.filter((s) => !bookedSeatIds.includes(s.id)).length,
      bookedSeats: bookedSeats.length,
      seatLayout: this.createSeatLayout(seats, bookedSeatIds),
    };
  }

  /**
   * 🎯 สร้างเลย์เอาต์ที่นั่ง
   */
  private createSeatLayout(seats: Seat[], bookedSeatIds: string[]) {
    const maxRow = Math.max(...seats.map((s) => s.rowIndex));
    const maxCol = Math.max(...seats.map((s) => s.columnIndex));

    const layout = [];
    for (let row = 0; row <= maxRow; row++) {
      const rowSeats = [];
      for (let col = 0; col <= maxCol; col++) {
        const seat = seats.find(
          (s) => s.rowIndex === row && s.columnIndex === col,
        );
        rowSeats.push({
          exists: !!seat,
          seatId: seat?.id || null,
          seatNumber: seat?.seatNumber || null,
          status: seat
            ? bookedSeatIds.includes(seat.id)
              ? 'booked'
              : 'available'
            : 'empty',
          isPremium: false,
        });
      }
      layout.push(rowSeats);
    }

    return layout;
  }

  /**
   * 📈 คำนวณการกระทำถัดไป
   */
  private getNextAction(order: Order) {
    switch (order.status) {
      case OrderStatus.PENDING:
        return {
          action: 'PAY',
          description: 'ชำระเงิน',
          actionUrl: `/payment/${order.id}`,
        };
      case OrderStatus.PENDING_SLIP:
        return {
          action: 'WAIT',
          description: 'รอตรวจสอบสลิป',
          actionUrl: null,
        };
      case OrderStatus.PAID:
        return {
          action: 'VIEW_TICKET',
          description: 'ดูตั๋ว',
          actionUrl: `/orders/${order.id}/ticket`,
        };
      case OrderStatus.CANCELLED:
      case OrderStatus.EXPIRED:
        return {
          action: 'BOOK_AGAIN',
          description: 'จองใหม่',
          actionUrl: '/booking',
        };
      default:
        return {
          action: 'CONTACT',
          description: 'ติดต่อเจ้าหน้าที่',
          actionUrl: '/contact',
        };
    }
  }

  /**
   * 🏆 คำนวณระดับสมาชิก
   */
  private calculateMembershipLevel(totalSpent: number) {
    if (totalSpent >= 50000) return 'VIP';
    if (totalSpent >= 20000) return 'GOLD';
    if (totalSpent >= 5000) return 'SILVER';
    return 'BRONZE';
  }

  /**
   * 🎖️ คำนวณความสำเร็จ
   */
  private calculateAchievements(totalOrders: number, totalSpent: number) {
    const achievements = [];

    if (totalOrders >= 1) achievements.push('ลูกค้าใหม่');
    if (totalOrders >= 5) achievements.push('ลูกค้าประจำ');
    if (totalOrders >= 10) achievements.push('ลูกค้า VIP');
    if (totalSpent >= 10000) achievements.push('ผู้สนับสนุน');
    if (totalSpent >= 50000) achievements.push('ผู้สนับสนุนใหญ่');

    return achievements;
  }
}
