import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createPdfBuffer } from '../utils/createPdfBuffer';

// ========================================
// 📊 ENTITIES
// ========================================
import { Order } from './order.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Seat } from '../seats/seat.entity';
import { User } from '../user/user.entity';
import { Referrer } from '../referrer/referrer.entity';
import { Payment } from '../payment/payment.entity';
import { AuditLog } from '../audit/audit-log.entity';

// ========================================
// 🔧 ENUMS & INTERFACES
// ========================================
import {
  UserRole,
  OrderStatus,
  PaymentMethod,
  TicketType,
  BookingStatus,
  AuditAction,
  OrderPurchaseType,
} from '../common/enums';
import { OrderData } from '../common/interfaces';

// ========================================
// 🛠️ UTILITIES & HELPERS
// ========================================
import {
  ThailandTimeHelper,
  LoggingHelper,
  ErrorHandlingHelper,
  OrderDataMapper,
} from '../common/utils';
// Removed unused constants imports - now using helpers

// ========================================
// 🔧 SERVICES
// ========================================
import { SeatBookingService } from '../common/services/seat-booking.service';
import { AuditHelperService } from '../common/services/audit-helper.service';

// ========================================
// 📊 HELPERS
// ========================================
import {
  OrderValidationHelper,
  OrderSeatManagementHelper,
  OrderPricingHelper,
  OrderExportImportHelper,
} from './helpers';
import type { ImportUpdateResult } from './helpers/order-export-import.helper';

// ========================================
// 📝 DTOs
// ========================================
export interface CreateOrderRequest {
  userId?: string;
  ticketType: TicketType;
  quantity?: number;
  seatIds?: string[];
  showDate: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  referrerCode?: string;
  paymentMethod?: PaymentMethod;
  note?: string;
  source?: string;
  purchaseType?: OrderPurchaseType;
  status?: OrderStatus; // เพิ่มฟิลด์ status
  standingAdultQty?: number; // จำนวนตั๋วผู้ใหญ่
  standingChildQty?: number; // จำนวนตั๋วเด็ก
  attendanceStatus?: string;
}

export interface FindAllOptions {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  zone?: string;
  referrerCode?: string;
  showDate?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  paymentMethod?: string;
  purchaseType?: string; // เพิ่มฟิลด์สำหรับกรองตาม purchaseType
  attendanceStatus?: string; // เพิ่มฟิลด์สำหรับกรองตาม attendanceStatus
  referrerName?: string; // กรองตามชื่อผู้แนะนำ
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(SeatBooking)
    private seatBookingRepo: Repository<SeatBooking>,
    @InjectRepository(Seat)
    private seatRepo: Repository<Seat>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Referrer)
    private referrerRepo: Repository<Referrer>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    private configService: ConfigService,
    private seatBookingService: SeatBookingService,
    private auditHelperService: AuditHelperService,
  ) {
    // Add console.log to verify logger initialization
  }

  // ========================================
  // 🎫 ORDER MANAGEMENT
  // ========================================
  // Note: Order creation has been moved to EnhancedOrderService for better concurrency control

  /**
   * ดึง order ด้วย id (public method สำหรับ controller)
   */
  async getOrderById(id: string): Promise<Order | null> {
    return await this.orderRepo.findOne({
      where: { id },
      relations: [
        'user',
        'seatBookings',
        'seatBookings.seat',
        'seatBookings.seat.zone',
      ],
    });
  }

  // ==============================================================
  // 🔍 FIND ALL ORDERS
  // ========================================
  async findAll(options: FindAllOptions, userId?: string): Promise<any> {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      createdBy,
      showDate,
      paymentMethod,
      purchaseType,
      referrerName,
    } = options;

    try {
      const contextLogger = LoggingHelper.createContextLogger('OrderService', {
        operation: 'findAll',
        userId: userId ? 'provided' : 'none',
      });
      contextLogger.logWithContext('info', 'Finding orders', { options });
      const query = this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.user', 'user')
        .leftJoinAndSelect('order.referrer', 'referrer')
        .leftJoinAndSelect('order.payment', 'payment')
        .leftJoinAndSelect('order.seatBookings', 'seatBookings')
        .leftJoinAndSelect('seatBookings.seat', 'seat')
        .leftJoinAndSelect('seat.zone', 'zone')
        .orderBy('order.createdAt', 'DESC');
      // User can only see their own orders
      if (userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (user && user.role === UserRole.USER) {
          query.andWhere('order.userId = :userId', { userId });
        }
      }

      if (paymentMethod) {
        query.andWhere('order.paymentMethod = :paymentMethod', {
          paymentMethod,
        });
      }
      if (status) {
        query.andWhere('order.status = :status', { status });
      }
      if (purchaseType) {
        query.andWhere('order.purchaseType = :purchaseType', { purchaseType });
      }
      if (options.attendanceStatus) {
        query.andWhere('order.attendanceStatus = :attendanceStatus', {
          attendanceStatus: options.attendanceStatus,
        });
      }
      if (search) {
        const searchValue = `%${search.toLowerCase()}%`;
        query.andWhere(
          '(LOWER(order.orderNumber) LIKE :search OR LOWER(order.customerName) LIKE :search OR LOWER(order.customerPhone) LIKE :search)',
          { search: searchValue },
        );
      }
      if (createdBy !== undefined) {
        if (createdBy === null || createdBy === 'null' || createdBy === '') {
          query.andWhere('order.createdBy IS NULL');
        } else {
          query.andWhere('order.createdBy = :createdBy', { createdBy });
        }
      }
      if (showDate !== undefined && showDate !== null && showDate !== '') {
        query.andWhere('DATE(order.showDate) = DATE(:showDate)', { showDate });
      }
      if (referrerName && referrerName.trim() !== '') {
        query.andWhere('referrer.code LIKE :referrerName', {
          referrerName: `%${referrerName.trim()}%`,
        });
      }
      // Manual pagination since we're using query builder
      query.skip((page - 1) * limit).take(limit);
      const [items, total] = await query.getManyAndCount();
      contextLogger.logWithContext('info', 'Orders found successfully', {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
      return {
        items: OrderDataMapper.mapOrdersToData(items) as OrderData[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      // ถ้าเกิด error จาก database (filter cancelled แล้วไม่มี order) ให้คืน array ว่าง
      if (error && error.name && error.name.includes('QueryFailedError')) {
        return {
          items: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 10,
          totalPages: 0,
        };
      }
      LoggingHelper.logError(
        this.logger,
        error as Error,
        {
          operation: 'findAll',
        },
        {
          options,
          userId,
        },
      );
      throw ErrorHandlingHelper.handleDatabaseError(error);
    }
  }

  // ===================================================================
  // 🔍 FIND BY ID
  // ========================================
  async findById(id: string, userId?: string): Promise<OrderData | null> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'user',
        'referrer',
        'seatBookings',
        'seatBookings.seat',
        'seatBookings.seat.zone',
        'payment',
      ],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    console.log('order', order);

    // Permission check for users
    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user) {
        OrderValidationHelper.validateOrderAccess(user, order, 'VIEW');
      }
    }

    return OrderDataMapper.mapToOrderData(order) as OrderData;
  }

  // =================================================================
  // ✏️ UPDATE ORDER
  // ======================================================================
  async update(
    id: string,
    updates: Partial<OrderData>,
    userId: string,
  ): Promise<OrderData> {
    this.logger.log(`✏️ Updating order ${id} by user ${userId}`);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'seatBookings'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Permission check ใช้ OrderValidationHelper
    OrderValidationHelper.validateOrderAccess(user, order, 'UPDATE');

    // Update order
    await this.orderRepo.update(id, {
      ...updates,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    } as any);

    // Create audit log ใช้ AuditHelperService
    await this.auditHelperService.auditOrderAction(
      AuditAction.UPDATE,
      id,
      userId,
      this.auditHelperService.createOrderUpdateMetadata(order, updates),
    );

    return this.findById(id);
  }

  // ==================================================================
  // ❌ CANCEL ORDER
  // ======================================================================
  async cancel(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`❌ Cancelling order ${id} by user ${userId}`);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'seatBookings'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Permission check ใช้ OrderValidationHelper
    OrderValidationHelper.validateOrderAccess(user, order, 'CANCEL');

    // Cancel order
    await this.orderRepo.update(id, {
      status: OrderStatus.CANCELLED,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    });

    // Release seat bookings ใช้ SeatBookingService
    if (order.seatBookings) {
      await this.seatBookingService.updateOrderSeatBookingsStatus(
        id,
        BookingStatus.CANCELLED,
      );
    }

    // Create audit log ใช้ AuditHelperService
    await this.auditHelperService.auditOrderAction(
      AuditAction.CANCEL,
      id,
      userId,
      this.auditHelperService.createOrderCancellationMetadata(
        id,
        'Order cancelled by user',
      ),
    );

    return { success: true, message: 'ยกเลิกออเดอร์สำเร็จ' };
  }

  // ===============================================================
  // ✅ CONFIRM PAYMENT
  // ==============================================================
  async confirmPayment(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`✅ Confirming payment for order ${id} by user ${userId}`);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['seatBookings'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Permission and status validation ใช้ OrderValidationHelper
    OrderValidationHelper.validatePaymentConfirmation(user, order);

    // Update order status
    await this.orderRepo.update(id, {
      status: OrderStatus.CONFIRMED,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    });

    // Update seat bookings ใช้ SeatBookingService
    if (order.seatBookings) {
      await this.seatBookingService.updateOrderSeatBookingsStatus(
        id,
        BookingStatus.CONFIRMED,
      );
    }

    // Create audit log ใช้ AuditHelperService
    await this.auditHelperService.auditOrderAction(
      AuditAction.CONFIRM,
      id,
      userId,
      this.auditHelperService.createPaymentConfirmationMetadata(
        id,
        order.totalAmount,
        order.paymentMethod,
      ),
    );

    return { success: true, message: 'ยืนยันการชำระเงินสำเร็จ' };
  }

  // ============================================================
  // 🎟️ GENERATE TICKETS
  // ========================================
  async generateTickets(id: string, userId: string): Promise<any> {
    this.logger.log(`🎟️ Generating tickets for order ${id} by user ${userId}`);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'user',
        'seatBookings',
        'seatBookings.seat',
        'seatBookings.seat.zone',
      ],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Permission check ใช้ OrderValidationHelper
    OrderValidationHelper.validateTicketGeneration(user, order);

    console.log('order', order);

    // Generate tickets ใช้ OrderDataMapper
    const ticketData = OrderDataMapper.mapToTicketData(order);

    // Create audit log ใช้ AuditHelperService
    await this.auditHelperService.auditOrderAction(
      AuditAction.VIEW,
      id,
      userId,
      {
        orderId: order.id,
        action: 'Tickets generated',
        ticketCount: ticketData.totalTickets,
        ticketType: order.ticketType,
        standingAdultQty:
          order.ticketType === TicketType.STANDING
            ? order.standingAdultQty
            : undefined,
        standingChildQty:
          order.ticketType === TicketType.STANDING
            ? order.standingChildQty
            : undefined,
      },
    );

    return ticketData;
  }

  // =================================================================
  // 🔄 CHANGE SEATS - COMPREHENSIVE VERSION
  // =================================================================
  async changeSeats(
    id: string,
    newSeatNumbers: string[],
    userId: string,
    newReferrerCode?: string,
    newCustomerName?: string,
    newCustomerPhone?: string,
    newCustomerEmail?: string,
    newShowDate?: string,
  ): Promise<{ success: boolean; message: string; updatedOrder?: any }> {
    this.logger.log(`🔄 Changing seats for order ${id} by user ${userId}`);
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        return {
          success: false,
          message: 'ไม่พบผู้ใช้',
          updatedOrder: null,
        };
      }

      const order = await this.orderRepo.findOne({
        where: { id },
        relations: ['seatBookings', 'seatBookings.seat', 'referrer', 'payment'],
      });

      if (!order) {
        return {
          success: false,
          message: 'ไม่พบออเดอร์',
          updatedOrder: null,
        };
      }

      // Only staff and admin can change seats - use helper
      try {
        OrderSeatManagementHelper.validateSeatChangePermissions(user, order);
      } catch (error) {
        return {
          success: false,
          message: error.message,
          updatedOrder: null,
        };
      }

      // Convert seat numbers to seat IDs - use helper
      const newSeatIds = await OrderValidationHelper.convertSeatNumbersToIds(
        newSeatNumbers,
        this.seatRepo,
      );

      // Get current seat count
      const currentSeatCount = order.seatBookings?.length || 0;
      const newSeatCount = newSeatIds.length;

      this.logger.log(
        `Current seats: ${currentSeatCount}, New seats: ${newSeatCount}`,
      );

      // Handle different order statuses
      switch (order.status) {
        case OrderStatus.PENDING:
        case OrderStatus.BOOKED:
          return await OrderSeatManagementHelper.changePendingBookedSeats(
            order,
            newSeatIds,
            userId,
            user,
            this.orderRepo,
            this.seatBookingRepo,
            this.seatRepo,
            this.referrerRepo,
            this.seatBookingService,
            this.auditHelperService,
            this.findById.bind(this),
            newReferrerCode,
            newCustomerName,
            newCustomerPhone,
            newCustomerEmail,
            newShowDate,
          );

        case OrderStatus.PAID:
          return await OrderSeatManagementHelper.changePaidSeats(
            order,
            newSeatIds,
            userId,
            user,
            currentSeatCount,
            newSeatCount,
            this.orderRepo,
            this.seatBookingRepo,
            this.seatRepo,
            this.auditHelperService,
            this.findById.bind(this),
            newShowDate,
          );

        default:
          return {
            success: false,
            message: 'สถานะออเดอร์ไม่ถูกต้อง',
            updatedOrder: null,
          };
      }
    } catch (err: any) {
      this.logger.error('Change seats failed:', err);
      return {
        success: false,
        message: `เปลี่ยนที่นั่งล้มเหลว: ${err?.message || 'เกิดข้อผิดพลาด'}`,
        updatedOrder: null,
      };
    }
  }
  async getOrderStats(): Promise<any> {
    this.logger.log('📊 Getting order statistics');

    const [
      totalOrders,
      confirmedOrders,
      pendingOrders,
      cancelledOrders,
      expiredOrders,
    ] = await Promise.all([
      this.orderRepo.count(),
      this.orderRepo.count({ where: { status: OrderStatus.CONFIRMED } }),
      this.orderRepo.count({ where: { status: OrderStatus.PENDING } }),
      this.orderRepo.count({ where: { status: OrderStatus.CANCELLED } }),
      this.orderRepo.count({ where: { status: OrderStatus.EXPIRED } }),
    ]);

    const totalRevenue = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: OrderStatus.CONFIRMED })
      .getRawOne();

    return {
      totalOrders,
      confirmedOrders,
      pendingOrders,
      cancelledOrders,
      expiredOrders,
      totalRevenue: totalRevenue.total || 0,
    };
  }

  // ================================================================
  // 🗑️ REMOVE ORDER
  // ======================================================================
  async remove(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`🗑️ Removing order ${id} by user ${userId}`);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['seatBookings'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only admin can remove orders
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin can remove orders');
    }

    // Remove seat bookings first
    if (order.seatBookings) {
      await this.seatBookingRepo.delete({ orderId: id });
    }

    // Remove order
    await this.orderRepo.delete(id);

    // Create audit log ใช้ AuditHelperService
    await this.auditHelperService.auditOrderAction(
      AuditAction.DELETE,
      id,
      userId,
      { reason: 'Order removed by admin' },
    );

    return { success: true, message: 'ลบออเดอร์สำเร็จ' };
  }

  // ==============================================================
  // 🕐 SCHEDULED TASKS
  // =================================================
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    this.logger.debug('🕐 Checking for expired orders...');

    const expiredOrders = await this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: Between(
          ThailandTimeHelper.toThailandTime('1970-01-01'),
          ThailandTimeHelper.now(),
        ),
      },
      relations: ['seatBookings'],
    });

    for (const order of expiredOrders) {
      // Update order status
      await this.orderRepo.update(order.id, {
        status: OrderStatus.EXPIRED,
        updatedAt: ThailandTimeHelper.now(),
      });

      // Release seat bookings
      if (order.seatBookings) {
        await this.seatBookingRepo.update(
          { orderId: order.id },
          {
            status: BookingStatus.EXPIRED,
            updatedAt: ThailandTimeHelper.now(),
          },
        );
      }

      this.logger.log(
        `⏰ Order ${order.orderNumber} expired and seats released`,
      );
    }
  }

  // =======================================================
  // 🔧 PRIVATE HELPER METHODS
  // ===============================================
  // 🔧 HELPER METHODS ที่เหลือ (ฟังก์ชันเฉพาะที่ไม่ได้ย้ายไป helpers)
  // ===============================================

  // =================================================================
  // ✏️ UPDATE ORDER FOR TICKET TYPE: STANDING
  // ======================================================================
  async updateStandingOrder(
    id: string,
    updates: Partial<OrderData>,
    userId: string,
  ): Promise<OrderData> {
    this.logger.log(`✏️ Updating standing order ${id} by user ${userId}`);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Use helper for permission check
    OrderValidationHelper.validateOrderAccess(user, order, 'UPDATE');

    // Use helper for status validation
    const allowedStatuses = [OrderStatus.PENDING, OrderStatus.BOOKED];
    if (user.role !== UserRole.ADMIN) {
      OrderValidationHelper.validateOrderStatusForChanges(
        order,
        allowedStatuses,
      );
    }

    // Update order
    await this.orderRepo.update(id, {
      ...updates,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    } as any);

    // Create audit log
    await this.auditHelperService.auditOrderAction(
      AuditAction.UPDATE,
      id,
      userId,
      updates,
    );

    return this.findById(id);
  }

  /**
   * 📄 Export ข้อมูลออเดอร์สำหรับ Excel/CSV
   */
  async exportOrdersData(filters: {
    status?: string;
    search?: string;
    createdBy?: string;
    showDate?: string;
    paymentMethod?: string;
    purchaseType?: string;
    attendanceStatus?: string;
    includeAllPages?: boolean;
    referrerName?: string;
  }): Promise<{
    orders: any[];
    summary: {
      totalOrders: number;
      totalAmount: number;
      totalCommission: number;
      statusBreakdown: Record<string, number>;
      purchaseTypeBreakdown: Record<string, number>;
      attendanceStatusBreakdown: Record<string, number>;
      ticketTypeBreakdown: Record<string, number>;
    };
    metadata: {
      exportDate: string;
      filters: any;
    };
  }> {
    try {
      this.logger.log('🔄 Starting export orders data process', filters);

      // ดึงข้อมูลทั้งหมดตาม filter (ไม่จำกัดจำนวน)
      const result = await this.findAll(
        {
          page: 1,
          limit: filters.includeAllPages ? 999999 : 1000, // จำกัดสูงสุด
          status: filters.status,
          search: filters.search,
          createdBy: filters.createdBy,
          showDate: filters.showDate,
          paymentMethod: filters.paymentMethod,
          purchaseType: filters.purchaseType,
          attendanceStatus: filters.attendanceStatus,
          referrerName: filters.referrerName,
        },
        undefined, // userId - ไม่จำกัดตาม user
      );

      const orders = Array.isArray(result.items) ? result.items : [];

      // คำนวณสรุปข้อมูล ใช้ OrderPricingHelper
      const summary = OrderPricingHelper.calculateOrdersSummary(orders);

      // เตรียมข้อมูลสำหรับ export
      const exportOrders = orders.map((order) => ({
        orderNumber: order.orderNumber,
        customerName: order.customerName || '-',
        customerPhone: order.customerPhone || '-',
        customerEmail: order.customerEmail || '-',
        ticketType: order.ticketType || '-',
        referrerName: order.referrer?.name || '-',
        quantity: order.quantity || 0,
        standingAdultQty: order.standingAdultQty || 0,
        standingChildQty: order.standingChildQty || 0,
        totalAmount: order.totalAmount || 0,
        status: order.status,
        purchaseType: order.purchaseType || OrderPurchaseType.ONSITE,
        attendanceStatus: order.attendanceStatus || 'PENDING',
        paymentMethod: order.paymentMethod || PaymentMethod.CASH,
        showDate: order.showDate
          ? new Date(order.showDate).toISOString().split('T')[0]
          : '-',
        createdAt: order.createdAt
          ? new Date(order.createdAt).toISOString()
          : '-',
        createdByName: order.createdByName || '-',
        referrerCode: order.referrerCode || '-',
        referrerCommission: order.referrerCommission || 0,
        standingCommission: order.standingCommission || 0,
        note: order.note || '-',
        seats: order.seats
          ? order.seats.map((s: any) => s.seatNumber).join(', ')
          : '-',
      }));

      this.logger.log(
        `✅ Export data prepared: ${exportOrders.length} orders`,
        summary,
      );

      return {
        orders: exportOrders,
        summary,
        metadata: {
          exportDate: new Date().toISOString(),
          filters,
        },
      };
    } catch (error) {
      this.logger.error('❌ Failed to export orders data', error.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการ export ข้อมูล: ${error.message}`,
      );
    }
  }

  /**
   *  สร้าง PDF ตามรูปแบบตารางใบเสร็จ (A4 แนวนอน)
   * ตรงตามภาพที่ส่งมา Boxing Stadium Patong Beach
   */
  async generateOrdersPDF(exportData: {
    orders: any[];
    summary: any;
    metadata: any;
  }): Promise<Buffer> {
    try {
      this.logger.log('🔄 Starting PDF generation for orders (Landscape A4)');

      // 📊 กำหนด PaymentMethod Header
      let paymentMethodHeader = 'ทุกช่องทาง'; // ค่าเริ่มต้น
      if (exportData.metadata?.filters?.paymentMethod) {
        const method = exportData.metadata.filters.paymentMethod;
        switch (method.toUpperCase()) {
          case 'CASH':
            paymentMethodHeader = 'เงินสด';
            break;
          case 'CREDIT_CARD':
            paymentMethodHeader = 'บัตรเครดิต';
            break;
          case 'BANK_TRANSFER':
            paymentMethodHeader = 'โอนเงิน';
            break;
          case 'QR_CODE':
            paymentMethodHeader = 'QR Code';
            break;
          default:
            paymentMethodHeader = method;
        }
      }

      // 📋 TABLE HEADERS - ปรับ rowSpan/colSpan ตามภาพตัวอย่าง
      const headers = [
        {
          text: 'NO.',
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
        {
          text: 'ชื่อเอเย่นต์',
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
        {
          text: 'จำนวนแขก',
          colSpan: 2,
          style: 'tableHeader',
          alignment: 'center',
        },
        {},
        {
          text: 'ราคามวย',
          colSpan: 2,
          style: 'tableHeader',
          alignment: 'center',
        },
        {},
        {
          text: 'เสื้อ',
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
        {
          text: 'เสื้อ F',
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
        {
          text: 'เงินทัวร์',
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
        {
          text: 'เสื้อ',
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
        {
          text: 'รวม',
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
        {
          text: 'ฟรี',
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
        {
          text: paymentMethodHeader,
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
        {
          text: 'No. V/C',
          rowSpan: 2,
          style: 'tableHeaderMiddle',
          alignment: 'center',
          valign: 'middle',
        },
      ];

      // Sub-headers สำหรับแถวที่ 2 (เฉพาะคอลัมน์ที่มี colSpan)
      const subHeaders = [
        '', // NO.
        '', // รายละเอียด
        'RS', // จำนวนแขก RS
        'STD', // จำนวนแขก STD
        'RS', // ราคามวย RS
        'STD', // ราคามวย STD
        '', // เสื้อ 300
        '', // เสื้อ F
        '', // เงินทัวร์
        '', // รวม
        '', // ฟรี
        '', // PaymentMethod
        '', // No./C
      ];

      // � เตรียมข้อมูลแถวสำหรับตาราง
      const tableRows = exportData.orders.map((order, index) => {
        // 📊 คำนวณจำนวนตั๋วแยกตามประเภท
        const standingQty =
          (order.standingAdultQty || 0) + (order.standingChildQty || 0);
        const ringsideQty =
          order.ticketType === 'RINGSIDE' ? order.quantity || 0 : 0;
        const stadiumQty =
          order.ticketType === 'STADIUM' ? order.quantity || 0 : 0;
        const rsQty = ringsideQty + stadiumQty;
        const stdQty = standingQty;
        const totalGuests = rsQty + stdQty;

        // 💰 คำนวณราคาตามประเภทตั๋ว
        const rsPrice = 1400;
        const stdPrice = 1200;
        const shirtPrice = 300;

        // ราคามวยแยกตามประเภท
        const rsBoxingPrice = rsPrice;
        const stdBoxingPrice = stdPrice;
        const totalBoxingPrice =
          totalGuests *
          (order.ticketType === 'RINGSIDE' ? rsBoxingPrice : stdBoxingPrice);

        // ค่าเสื้อรวม
        const ShirtPrice = shirtPrice;
        const totalShirtPrice = totalGuests * shirtPrice;

        // เงินทัวร์ = ราคามวย - ค่าเสื้อ
        const tourMoney = totalBoxingPrice - totalShirtPrice;

        // รวม = เงินทัวร์ + เสื้อ
        const totalAmount = tourMoney + totalShirtPrice;

        // Logic: ช่องที่เป็น 0 ไม่ต้องโชว์ 0 ให้เป็นว่าง
        function showValue(val: number | string) {
          if (typeof val === 'string') val = Number(val.replace(/,/g, ''));
          return val === 0 ? '' : val.toLocaleString();
        }

        // Logic: ชื่อเอเย่นต์ ถ้าไม่มีให้ว่าง, ถ้าซ้ำกับออเดอร์ก่อนหน้าให้ว่าง
        let refName = order.referrerName || '';
        if (
          index > 0 &&
          exportData.orders[index - 1]?.referrerName === refName
        ) {
          refName = '';
        }

        return [
          (index + 1).toString(), // NO.
          refName, // ชื่อเอเย่นต์
          rsQty === 0 ? '' : rsQty.toString(), // จำนวนแขก RS
          stdQty === 0 ? '' : stdQty.toString(), // จำนวนแขก STD
          showValue(rsBoxingPrice), // ราคามวย RS
          showValue(stdBoxingPrice), // ราคามวย STD
          showValue(ShirtPrice), // เสื้อ 300
          '', // เสื้อ F (ว่าง)
          tourMoney === 0
            ? ''
            : tourMoney.toLocaleString('en-US', { minimumFractionDigits: 2 }), // เงินทัวร์
          totalShirtPrice === 0
            ? ''
            : totalShirtPrice.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              }), // จำนวนรวมเสื้อ
          totalAmount === 0
            ? ''
            : totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }), // รวม
          '', // ฟรี (ว่าง)
          totalAmount === 0
            ? ''
            : totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }), // PaymentMethod column
          '', // No./C (ชื่อลูกค้า)
        ];
      });

      // � คำนวณสรุปสำหรับแถวท้าย
      let totalRS = 0;
      let totalSTD = 0;
      let totalRSBoxingPrice = 0; // ราคามวย RS แยก
      let totalSTDBoxingPrice = 0; // ราคามวย STD แยก
      let totalShirtPrice = 0;
      let totalTourMoney = 0;
      let grandTotal = 0;
      let shirtPriceTotals = 0;

      // วนลูปคำนวณผลรวมจาก tableRows
      exportData.orders.forEach((order) => {
        const standingQty =
          (order.standingAdultQty || 0) + (order.standingChildQty || 0);
        const ringsideQty =
          order.ticketType === 'RINGSIDE' ? order.quantity || 0 : 0;
        const stadiumQty =
          order.ticketType === 'STADIUM' ? order.quantity || 0 : 0;
        const rsQty = ringsideQty + stadiumQty;
        const stdQty = standingQty;
        const guests = rsQty + stdQty;

        const rsPrice = 1400;
        const stdPrice = 1200;
        const shirtPrice = 300;

        const rsBoxingPrice = rsQty * rsPrice; // ราคามวย RS
        const stdBoxingPrice = stdQty * stdPrice; // ราคามวย STD
        const totalBoxingPrice = rsBoxingPrice + stdBoxingPrice;
        const shirtPriceTotal = guests * shirtPrice;
        const tourMoney = totalBoxingPrice - shirtPriceTotal;
        const total = tourMoney + shirtPriceTotal;

        totalRS += rsQty;
        totalSTD += stdQty;
        // totalRSBoxingPrice += rsBoxingPrice;
        // totalSTDBoxingPrice += stdBoxingPrice;
        totalRSBoxingPrice += 0;
        totalSTDBoxingPrice += 0;
        totalShirtPrice += shirtPriceTotal;
        shirtPriceTotals += 0;
        totalTourMoney += tourMoney;
        grandTotal += total;
      });

      // เพิ่มแถวสรุปท้ายตาราง (ปรับให้ตรงกับโครงสร้างใหม่)
      const summaryRow = [
        'รวม', // NO.
        'สรุปทั้งหมด', // รายละเอียด
        totalRS.toString(), // จำนวนแขก RS
        totalSTD.toString(), // จำนวนแขก STD
        totalRSBoxingPrice.toLocaleString(), // ราคามวย RS
        totalSTDBoxingPrice.toLocaleString(), // ราคามวย STD
        shirtPriceTotals.toLocaleString(), // เสื้อ 300
        '', // เสื้อ F
        totalTourMoney.toLocaleString('en-US', { minimumFractionDigits: 2 }), // เงินทัวร์
        totalShirtPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }), // จำนวนรวมเสื้อ
        grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), // รวม
        '', // ฟรี
        grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), // PaymentMethod column
        ``, // No./C
      ];

      // เพิ่ม summaryRow เข้าไปใน tableRows
      tableRows.push(summaryRow);
      const today = new Date();

      const weekday = today.toLocaleDateString('th-TH', { weekday: 'long' }); // เช่น "วันอาทิตย์"
      const datePart = today.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // ลบคำว่า "วัน" ออก แล้วประกอบใหม่
      const thaiDate = `วัน ${weekday.replace('วัน', '')}${datePart}`;

      // 🏗️ สร้าง PDF Document Definition สำหรับ pdfmake
      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape', // ⭐ A4 แนวนอน
        pageMargins: [30, 60, 20, 60],
        defaultStyle: {
          font: 'THSarabunNew', // ใช้ฟอนต์ไทย
          fontSize: 10,
        },
        content: [
          // 🏢 หัวเอกสาร
          {
            text: 'Boxing Stadium Patong Beach 2/59 Soi Keh Sub2, Sai Nam Yen RD, Patong Beach Phuket 83150 Thailand',
            style: 'header',
            alignment: 'center',
            fontSize: 22,

            margin: [0, 0, 0, 10],
          },
          {
            text: `${thaiDate}`,
            alignment: 'center',
            fontSize: 25,
            margin: [0, 0, 0, 20],
          },
          // 📊 ตารางข้อมูล (ปรับ layout ใหม่ตามภาพตัวอย่าง - 2 แถว header)
          {
            table: {
              headerRows: 2, // 2 แถว header (main + sub)
              widths: [25, 150, 25, 25, 35, 35, 35, 35, 60, 60, 60, 15, 60, 50], // ความกว้างคอลัมน์ใหม่
              body: [
                // แถวที่ 1: Main headers (ใช้ style จาก header object)
                headers,
                // แถวที่ 2: Sub headers (ใช้ style tableSubHeader ปกติ)
                subHeaders.map((subHeader) => ({
                  text: subHeader,
                  style: 'tableSubHeader',
                  alignment: 'center',
                })),
                // ข้อมูลแถว
                ...tableRows.map((row) =>
                  row.map((cell, index) => ({
                    text: cell,
                    style: 'tableCell',
                    alignment: [2, 3, 8, 9, 10, 12].includes(index)
                      ? 'right' // RS, STD, เงินทัวร์, เสื้อ, รวม, paymentMethodHeader
                      : index === 0 || index === 1 // NO. และ ชื่อเอเย่นต์
                        ? 'left' // รายละเอียดและชื่อลูกค้าชิดซ้าย
                        : index === 13
                          ? 'center' // PaymentMethod column
                          : 'center',
                  })),
                ),
              ],
            },
            layout: {
              hLineWidth: () => 0.1,
              vLineWidth: () => 0.1,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
          },
        ],
        styles: {
          header: {
            fontSize: 16,
            bold: true,
          },
          tableHeader: {
            bold: true,
            fontSize: 16,
            color: 'black',
            fillColor: '#ffffff',
          },
          tableHeaderMiddle: {
            bold: true,
            fontSize: 16,
            color: 'black',
            fillColor: '#ffffff',
            alignment: 'center',
            valign: 'middle',
            margin: [0, 6, 0, 0],
          },
          tableSubHeader: {
            bold: true,
            fontSize: 14,
            color: 'black',
            fillColor: '#f8f8f8',
          },
          tableCell: {
            fontSize: 14,
          },
          summaryHeader: {
            fontSize: 16,
            bold: true,
          },
        },
      };

      // 🎯 สร้าง PDF Buffer
      const pdfBuffer = await createPdfBuffer(docDefinition);

      this.logger.log(
        `✅ PDF generated successfully: ${pdfBuffer.length} bytes (Landscape A4)`,
      );
      return pdfBuffer;
    } catch (error) {
      this.logger.error('❌ Failed to generate PDF', error.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการสร้าง PDF: ${error.message}`,
      );
    }
  }

  // ========================================
  // 📤 EXPORT/IMPORT METHODS
  // ========================================

  /**
   * Export orders to spreadsheet format (CSV or Excel)
   */
  async exportOrders(
    orderIds: string[],
    format: 'csv' | 'excel' = 'csv',
    includePayments: boolean = true,
  ): Promise<{ data: string | Buffer; filename: string; mimeType: string }> {
    try {
      this.logger.log(
        `🔄 Exporting ${orderIds.length} orders to ${format.toUpperCase()} format`,
      );

      // ถ้า orderIds ว่าง ให้ export ทั้งหมด
      let whereCondition = {};
      if (orderIds.length > 0) {
        whereCondition = { id: In(orderIds) };
      }

      // Fix: ใช้ In() operator และ relation 'payment' (เอกพจน์) แทน 'payments' (พหูพจน์)
      const relations = [
        'user',
        'referrer',
        'seatBookings',
        'seatBookings.seat',
        'seatBookings.seat.zone',
      ];

      if (includePayments) {
        relations.push('payment');
      }

      const orders = await this.orderRepo.find({
        where: whereCondition,
        relations,
        order: { createdAt: 'DESC' },
      });

      if (orders.length === 0) {
        throw new NotFoundException('ไม่พบออเดอร์ที่ต้องการ export');
      }

      // ใช้ helper สำหรับสร้างไฟล์ตาม format
      const result = await OrderExportImportHelper.exportToFile(
        orders,
        format,
        includePayments,
      );

      this.logger.log(
        `✅ Successfully exported ${orders.length} orders to ${format.toUpperCase()}`,
      );
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to export orders', error.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการ export ออเดอร์: ${error.message}`,
      );
    }
  }

  /**
   * Import and update orders from spreadsheet data
   */
  async importAndUpdateOrders(
    importData: any[],
    userId: string,
  ): Promise<ImportUpdateResult> {
    try {
      this.logger.log(`🔄 Importing and updating ${importData.length} orders`);

      const result = await OrderExportImportHelper.importAndUpdateOrders(
        importData,
        this.orderRepo,
        this.paymentRepo,
        this.seatBookingRepo,
        userId,
      );

      this.logger.log(
        `✅ Import completed: ${result.ordersUpdated} orders updated, ${result.paymentsUpdated} payments updated`,
      );

      return result;
    } catch (error) {
      this.logger.error('❌ Failed to import orders', error.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการ import ออเดอร์: ${error.message}`,
      );
    }
  }

  /**
   * Import ออเดอร์จาก file buffer (CSV/Excel)
   */
  async importOrdersFromFileBuffer(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    userId: string,
  ): Promise<ImportUpdateResult> {
    try {
      this.logger.log(
        `📄 Importing orders from file: ${filename} (${mimeType})`,
      );

      const result = await OrderExportImportHelper.importFromFileBuffer(
        buffer,
        mimeType,
        filename,
        this.orderRepo,
        this.paymentRepo,
        this.seatBookingRepo,
        userId,
      );

      this.logger.log(
        `✅ File import completed: ${result.ordersUpdated} orders updated, ${result.errors?.length || 0} errors`,
      );

      return result;
    } catch (error) {
      this.logger.error('❌ Failed to import from file', error.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการ import ไฟล์: ${error.message}`,
      );
    }
  }
}
