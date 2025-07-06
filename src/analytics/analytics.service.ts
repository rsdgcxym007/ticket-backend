import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../order/order.entity';
import { Payment } from '../payment/payment.entity';
import { Referrer } from '../referrer/referrer.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  BookingStatus,
} from '../common/enums';
import { DateTimeHelper } from '../common/utils';
import { GetCustomReportDto, ExportReportDto } from './dto/analytics.dto';

export interface DailySalesReport {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByPaymentMethod: Record<PaymentMethod, number>;
  ordersByTicketType: Record<TicketType, number>;
  ordersBySource: Record<string, number>;
}

export interface MonthlySalesReport {
  month: string;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  dailyBreakdown: DailySalesReport[];
  topReferrers: ReferrerReport[];
  paymentMethodStats: Record<PaymentMethod, number>;
}

export interface ReferrerReport {
  referrerId: string;
  referrerCode: string;
  referrerName: string;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  period: string;
}

export interface SeatUtilizationReport {
  date: string;
  totalSeats: number;
  bookedSeats: number;
  paidSeats: number;
  utilizationRate: number;
  revenuePerSeat: number;
}

export interface RevenueReport {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueByPaymentMethod: Record<PaymentMethod, number>;
  revenueByTicketType: Record<TicketType, number>;
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
}

export interface PaymentMethodStats {
  method: PaymentMethod;
  totalOrders: number;
  totalRevenue: number;
  percentage: number;
}

export interface HourlyStats {
  hour: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface PerformanceMetrics {
  conversionRate: number;
  averageOrderValue: number;
  customerRetentionRate: number;
  refundRate: number;
  cancellationRate: number;
}

export interface RealTimeStats {
  todayOrders: number;
  todayRevenue: number;
  onlineUsers: number;
  pendingOrders: number;
  availableSeats: number;
  lastUpdated: Date;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Referrer)
    private referrerRepo: Repository<Referrer>,
    @InjectRepository(SeatBooking)
    private seatBookingRepo: Repository<SeatBooking>,
  ) {}

  /**
   * 📊 รายงานยอดขายรายวัน
   */
  async getDailySalesReport(date: string): Promise<DailySalesReport> {
    this.logger.log(`📊 สร้างรายงานยอดขายวันที่ ${date}`);

    const startDate = DateTimeHelper.startOfDay(new Date(date));
    const endDate = DateTimeHelper.endOfDay(new Date(date));

    // ข้อมูลออเดอร์ทั้งหมด
    const orders = await this.orderRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['payment', 'referrer'],
    });

    // คำนวณสถิติ
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status === OrderStatus.PAID)
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const totalCommission = orders.reduce(
      (sum, o) => sum + Number(o.referrerCommission || 0),
      0,
    );

    // จำแนกตามสถานะ
    const ordersByStatus = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<OrderStatus, number>,
    );

    // จำแนกตามวิธีชำระเงิน
    const ordersByPaymentMethod = orders.reduce(
      (acc, order) => {
        if (order.payment) {
          acc[order.payment.method] = (acc[order.payment.method] || 0) + 1;
        }
        return acc;
      },
      {} as Record<PaymentMethod, number>,
    );

    // จำแนกตามประเภทตั๋ว
    const ordersByTicketType = orders.reduce(
      (acc, order) => {
        if (order.ticketType) {
          acc[order.ticketType] = (acc[order.ticketType] || 0) + 1;
        }
        return acc;
      },
      {} as Record<TicketType, number>,
    );

    // จำแนกตามแหล่งที่มา
    const ordersBySource = orders.reduce(
      (acc, order) => {
        const source = order.source || 'DIRECT';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      date,
      totalOrders,
      totalRevenue,
      totalCommission,
      ordersByStatus,
      ordersByPaymentMethod,
      ordersByTicketType,
      ordersBySource,
    };
  }

  /**
   * 📈 รายงานยอดขายรายเดือน
   */
  async getMonthlySalesReport(
    year: number,
    month: number,
  ): Promise<DailySalesReport[]> {
    this.logger.log(`📈 สร้างรายงานรายเดือน ${year}-${month}`);

    const startDate = new Date(year, month - 1, 1);
    console.log('startDate', startDate);

    const endDate = new Date(year, month, 0);

    const reports: DailySalesReport[] = [];

    for (let day = 1; day <= endDate.getDate(); day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const report = await this.getDailySalesReport(dateStr);
      reports.push(report);
    }

    return reports;
  }

  /**
   * 👥 รายงานผู้แนะนำ
   */
  async getReferrerReport(
    startDate: string,
    endDate: string,
  ): Promise<ReferrerReport[]> {
    this.logger.log(`👥 สร้างรายงานผู้แนะนำ ${startDate} - ${endDate}`);

    const start = DateTimeHelper.startOfDay(new Date(startDate));
    const end = DateTimeHelper.endOfDay(new Date(endDate));

    const referrers = await this.referrerRepo
      .createQueryBuilder('referrer')
      .leftJoinAndSelect(
        'referrer.orders',
        'order',
        'order.createdAt BETWEEN :start AND :end AND order.status = :status',
        { start, end, status: OrderStatus.PAID },
      )
      .getMany();

    return referrers.map((referrer) => {
      const orders = referrer.orders || [];
      const totalRevenue = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount || 0),
        0,
      );
      const totalCommission = orders.reduce(
        (sum, order) => sum + Number(order.referrerCommission || 0),
        0,
      );

      return {
        referrerId: referrer.id,
        referrerCode: referrer.code,
        referrerName: referrer.name,
        totalOrders: orders.length,
        totalRevenue,
        totalCommission,
        period: `${startDate} - ${endDate}`,
      };
    });
  }

  /**
   * 💺 รายงานการใช้งานที่นั่ง
   */
  async getSeatUtilizationReport(date: string): Promise<SeatUtilizationReport> {
    this.logger.log(`💺 สร้างรายงานการใช้งานที่นั่งวันที่ ${date}`);

    const targetDate = new Date(date);

    // นับที่นั่งทั้งหมดที่จองในวันนี้
    const bookings = await this.seatBookingRepo.find({
      where: {
        showDate: DateTimeHelper.formatDate(targetDate),
      },
      relations: ['order'],
    });

    const totalSeats = 500; // จำนวนที่นั่งทั้งหมด (ควรมาจาก config)
    const bookedSeats = bookings.length;
    const paidSeats = bookings.filter(
      (b) => b.order?.status === OrderStatus.PAID,
    ).length;

    const utilizationRate =
      totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

    const totalRevenue = bookings
      .filter((b) => b.order?.status === OrderStatus.PAID)
      .reduce((sum, b) => sum + Number(b.order?.totalAmount || 0), 0);

    const revenuePerSeat = paidSeats > 0 ? totalRevenue / paidSeats : 0;

    return {
      date,
      totalSeats,
      bookedSeats,
      paidSeats,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      revenuePerSeat: Math.round(revenuePerSeat * 100) / 100,
    };
  }

  /**
   * 📊 สรุปสถิติแบบ Real-time
   */
  async getRealtimeStats() {
    this.logger.log('📊 ดึงสถิติแบบ Real-time');

    const today = DateTimeHelper.formatDate(DateTimeHelper.now());

    // สถิติวันนี้
    const todayReport = await this.getDailySalesReport(today);

    // ออเดอร์ที่รอดำเนินการ
    const pendingOrders = await this.orderRepo.count({
      where: { status: OrderStatus.PENDING },
    });

    // ออเดอร์ที่รอตรวจสอบสลิป
    const pendingSlipOrders = await this.orderRepo.count({
      where: { status: OrderStatus.PENDING_SLIP },
    });

    // ที่นั่งที่ว่างวันนี้
    const seatUtilization = await this.getSeatUtilizationReport(today);

    return {
      today: todayReport,
      pendingOrders,
      pendingSlipOrders,
      seatUtilization,
      lastUpdated: DateTimeHelper.now(),
    };
  }

  /**
   * 📈 เปรียบเทียบยอดขายรายสัปดาห์
   */
  async getWeeklyComparison() {
    this.logger.log('📈 เปรียบเทียบยอดขายรายสัปดาห์');

    const thisWeekStart = DateTimeHelper.startOfWeek(DateTimeHelper.now());
    const lastWeekStart = DateTimeHelper.addDays(thisWeekStart, -7);
    const lastWeekEnd = DateTimeHelper.addDays(thisWeekStart, -1);

    const thisWeekOrders = await this.orderRepo.find({
      where: {
        createdAt: Between(thisWeekStart, DateTimeHelper.now()),
        status: OrderStatus.PAID,
      },
    });

    const lastWeekOrders = await this.orderRepo.find({
      where: {
        createdAt: Between(lastWeekStart, lastWeekEnd),
        status: OrderStatus.PAID,
      },
    });

    const thisWeekRevenue = thisWeekOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0,
    );
    const lastWeekRevenue = lastWeekOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0,
    );

    const revenueGrowth =
      lastWeekRevenue > 0
        ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
        : 0;

    return {
      thisWeek: {
        orders: thisWeekOrders.length,
        revenue: thisWeekRevenue,
      },
      lastWeek: {
        orders: lastWeekOrders.length,
        revenue: lastWeekRevenue,
      },
      growth: {
        orders: thisWeekOrders.length - lastWeekOrders.length,
        revenue: thisWeekRevenue - lastWeekRevenue,
        revenuePercentage: Math.round(revenueGrowth * 100) / 100,
      },
    };
  }

  /**
   * 📊 รายงานยอดขายตามช่วงวันที่
   */
  async getDateRangeSalesReport(
    startDate: string,
    endDate: string,
  ): Promise<RevenueReport> {
    this.logger.log(`📊 สร้างรายงานยอดขายตั้งแต่ ${startDate} ถึง ${endDate}`);

    const start = new Date(startDate);
    const end = new Date(endDate);

    const orders = await this.orderRepo.find({
      where: {
        createdAt: Between(start, end),
      },
      relations: ['payment', 'referrer'],
    });

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status === OrderStatus.PAID)
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Revenue by payment method
    const revenueByPaymentMethod = orders
      .filter((o) => o.payment && o.status === OrderStatus.PAID)
      .reduce(
        (acc, order) => {
          if (order.payment) {
            acc[order.payment.method] =
              (acc[order.payment.method] || 0) + Number(order.totalAmount || 0);
          }
          return acc;
        },
        {} as Record<PaymentMethod, number>,
      );

    // Revenue by ticket type
    const revenueByTicketType = orders
      .filter((o) => o.status === OrderStatus.PAID)
      .reduce(
        (acc, order) => {
          if (order.ticketType) {
            acc[order.ticketType] =
              (acc[order.ticketType] || 0) + Number(order.totalAmount || 0);
          }
          return acc;
        },
        {} as Record<TicketType, number>,
      );

    // Daily revenue breakdown
    const dailyRevenue: Array<{
      date: string;
      revenue: number;
      orders: number;
    }> = [];
    const daysBetween = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    for (let i = 0; i <= daysBetween; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = DateTimeHelper.formatDate(date);
      const dayOrders = orders.filter(
        (o) =>
          DateTimeHelper.formatDate(o.createdAt) === dateStr &&
          o.status === OrderStatus.PAID,
      );

      dailyRevenue.push({
        date: dateStr,
        revenue: dayOrders.reduce(
          (sum, o) => sum + Number(o.totalAmount || 0),
          0,
        ),
        orders: dayOrders.length,
      });
    }

    return {
      startDate,
      endDate,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      revenueByPaymentMethod,
      revenueByTicketType,
      dailyRevenue,
    };
  }

  /**
   * 📊 รายงานรายได้
   */
  async getRevenueReport(
    startDate: string,
    endDate: string,
    paymentMethod?: PaymentMethod,
    orderStatus?: OrderStatus,
  ): Promise<RevenueReport> {
    console.log('paymentMethod', paymentMethod, orderStatus);

    return this.getDateRangeSalesReport(startDate, endDate);
  }

  /**
   * 📊 ผู้แนะนำที่ดีที่สุด
   */
  async getTopReferrers(
    limit: number = 10,
    startDate?: string,
    endDate?: string,
  ): Promise<ReferrerReport[]> {
    this.logger.log(`📊 หาผู้แนะนำที่ดีที่สุด ${limit} คน`);

    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const orders = await this.orderRepo.find({
      where: whereClause,
      relations: ['referrer'],
    });

    const referrerStats = orders
      .filter((o) => o.referrer)
      .reduce(
        (acc, order) => {
          const referrerId = order.referrer!.id;
          if (!acc[referrerId]) {
            acc[referrerId] = {
              referrerId,
              referrerCode: order.referrer!.code,
              referrerName: order.referrer!.name,
              totalOrders: 0,
              totalRevenue: 0,
              totalCommission: 0,
              period:
                startDate && endDate ? `${startDate} - ${endDate}` : 'All time',
            };
          }

          acc[referrerId].totalOrders += 1;
          if (order.status === OrderStatus.PAID) {
            acc[referrerId].totalRevenue += Number(order.totalAmount || 0);
            acc[referrerId].totalCommission += Number(
              order.referrerCommission || 0,
            );
          }

          return acc;
        },
        {} as Record<string, ReferrerReport>,
      );

    return Object.values(referrerStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  /**
   * 📊 สถิติวิธีการชำระเงิน
   */
  async getPaymentMethodStats(
    startDate: string,
    endDate: string,
  ): Promise<PaymentMethodStats[]> {
    this.logger.log(`📊 สถิติวิธีการชำระเงิน ${startDate} - ${endDate}`);

    const orders = await this.orderRepo.find({
      where: {
        createdAt: Between(new Date(startDate), new Date(endDate)),
        status: OrderStatus.PAID,
      },
      relations: ['payment'],
    });

    const totalOrders = orders.length;
    console.log('totalOrders', totalOrders);

    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0,
    );

    const methodStats = orders
      .filter((o) => o.payment)
      .reduce(
        (acc, order) => {
          const method = order.payment!.method;
          if (!acc[method]) {
            acc[method] = {
              method,
              totalOrders: 0,
              totalRevenue: 0,
              percentage: 0,
            };
          }

          acc[method].totalOrders += 1;
          acc[method].totalRevenue += Number(order.totalAmount || 0);

          return acc;
        },
        {} as Record<PaymentMethod, PaymentMethodStats>,
      );

    // Calculate percentages
    Object.values(methodStats).forEach((stat) => {
      stat.percentage =
        totalRevenue > 0 ? (stat.totalRevenue / totalRevenue) * 100 : 0;
    });

    return Object.values(methodStats);
  }

  /**
   * 📊 สถิติรายชั่วโมง
   */
  async getHourlyStats(date: string): Promise<HourlyStats[]> {
    this.logger.log(`📊 สถิติรายชั่วโมง ${date}`);

    const startDate = DateTimeHelper.startOfDay(new Date(date));
    const endDate = DateTimeHelper.endOfDay(new Date(date));

    const orders = await this.orderRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const hourlyStats: HourlyStats[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const hourOrders = orders.filter((o) => {
        const orderHour = new Date(o.createdAt).getHours();
        return orderHour === hour;
      });

      const totalRevenue = hourOrders
        .filter((o) => o.status === OrderStatus.PAID)
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      hourlyStats.push({
        hour,
        totalOrders: hourOrders.length,
        totalRevenue,
        averageOrderValue:
          hourOrders.length > 0 ? totalRevenue / hourOrders.length : 0,
      });
    }

    return hourlyStats;
  }

  /**
   * 📊 เมตริกการประสิทธิภาพ
   */
  async getPerformanceMetrics(
    startDate?: string,
    endDate?: string,
  ): Promise<PerformanceMetrics> {
    this.logger.log(`📊 เมตริกการประสิทธิภาพ`);

    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const orders = await this.orderRepo.find({
      where: whereClause,
    });

    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.status === OrderStatus.PAID);
    const cancelledOrders = orders.filter(
      (o) => o.status === OrderStatus.CANCELLED,
    );
    const refundedOrders = orders.filter(
      (o) => o.status === OrderStatus.REFUNDED,
    );

    const conversionRate =
      totalOrders > 0 ? (paidOrders.length / totalOrders) * 100 : 0;
    const cancellationRate =
      totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0;
    const refundRate =
      paidOrders.length > 0
        ? (refundedOrders.length / paidOrders.length) * 100
        : 0;

    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0,
    );
    const averageOrderValue =
      paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    // Customer retention (simplified - customers who made more than 1 order)
    const customerOrders = paidOrders.reduce(
      (acc, order) => {
        if (order.customerName) {
          acc[order.customerName] = (acc[order.customerName] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const returningCustomers = Object.values(customerOrders).filter(
      (count) => count > 1,
    ).length;
    const totalCustomers = Object.keys(customerOrders).length;
    const customerRetentionRate =
      totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    return {
      conversionRate,
      averageOrderValue,
      customerRetentionRate,
      refundRate,
      cancellationRate,
    };
  }

  /**
   * 📊 สถิติเรียลไทม์
   */
  async getRealTimeStats(): Promise<RealTimeStats> {
    this.logger.log('📊 ดึงสถิติเรียลไทม์');

    const today = DateTimeHelper.formatDate(DateTimeHelper.now());
    const startOfDay = DateTimeHelper.startOfDay(new Date(today));

    const todayOrders = await this.orderRepo.count({
      where: {
        createdAt: Between(startOfDay, DateTimeHelper.now()),
      },
    });

    const todayRevenue = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.createdAt >= :startOfDay', { startOfDay })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .select('SUM(order.totalAmount)', 'total')
      .getRawOne();

    const pendingOrders = await this.orderRepo.count({
      where: { status: OrderStatus.PENDING },
    });

    const availableSeats = await this.seatBookingRepo.count({
      where: { status: BookingStatus.AVAILABLE },
    });

    return {
      todayOrders,
      todayRevenue: Number(todayRevenue?.total || 0),
      onlineUsers: 0, // This would come from websocket connections
      pendingOrders,
      availableSeats,
      lastUpdated: DateTimeHelper.now(),
    };
  }

  /**
   * 📊 รายงานแบบกำหนดเอง
   */
  async getCustomReport(dto: GetCustomReportDto): Promise<any> {
    this.logger.log(`📊 สร้างรายงานแบบกำหนดเอง: ${dto.reportName}`);

    // This is a simplified implementation
    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.payment', 'payment')
      .leftJoinAndSelect('order.referrer', 'referrer');

    if (dto.filterBy) {
      query.andWhere(`order.status = :status`, { status: dto.filterBy });
    }

    if (dto.sortBy) {
      const sortOrder = dto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
      query.orderBy(`order.${dto.sortBy}`, sortOrder);
    }

    if (dto.limit) {
      query.take(dto.limit);
    }

    if (dto.offset) {
      query.skip(dto.offset);
    }

    const orders = await query.getMany();

    return {
      reportName: dto.reportName,
      totalRecords: orders.length,
      data: orders,
      parameters: dto,
      generatedAt: DateTimeHelper.now(),
    };
  }

  /**
   * 📊 ส่งออกรายงาน
   */
  async exportReport(dto: ExportReportDto): Promise<Buffer> {
    this.logger.log(`📊 ส่งออกรายงาน: ${dto.reportType}`);

    const reportData = await this.getDateRangeSalesReport(
      dto.startDate,
      dto.endDate,
    );

    // Convert to Excel format (mock implementation)
    const excelData = JSON.stringify(reportData, null, 2);
    return Buffer.from(excelData, 'utf-8');
  }

  /**
   * 📊 สร้างรายงาน PDF
   */
  async generatePDFReport(reportType: string, date: string): Promise<Buffer> {
    this.logger.log(`📊 สร้างรายงาน PDF: ${reportType} สำหรับวันที่ ${date}`);

    const reportData = await this.getDailySalesReport(date);

    // Convert to PDF format (mock implementation)
    const pdfData = JSON.stringify(reportData, null, 2);
    return Buffer.from(pdfData, 'utf-8');
  }
}
