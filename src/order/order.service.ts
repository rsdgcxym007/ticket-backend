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
  OrderStatus,
  BookingStatus,
  PaymentStatus,
  TicketType,
  PaymentMethod,
  UserRole,
  OrderSource,
  AuditAction,
} from '../common/enums';

import {
  BOOKING_LIMITS,
  TIME_LIMITS,
  TICKET_PRICES,
  COMMISSION_RATES,
} from '../common/constants';

import {
  DateTimeHelper,
  ReferenceGenerator,
  BusinessLogicHelper,
  LoggingHelper,
  ErrorHandlingHelper,
} from '../common/utils';

import { OrderData } from '../common/interfaces';
import { ThailandTimeHelper } from '../common/utils/thailand-time.helper';

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
  status?: OrderStatus; // เพิ่มฟิลด์ status
  standingAdultQty?: number; // จำนวนตั๋วผู้ใหญ่
  standingChildQty?: number; // จำนวนตั๋วเด็ก
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
  ) {
    // Add console.log to verify logger initialization
  }

  // ========================================
  // 🎫 CREATE ORDER
  // ========================================
  async createOrder(
    request: CreateOrderRequest,
    userId: string,
  ): Promise<OrderData> {
    // Add logger usage for debugging
    this.logger.log(`🎫 Creating new order for user: ${userId}`);
    this.logger.log('Request received:', request);

    console.log('213213ko1ldjlwkdfjlqwdjlwqdjwlqjdwqldjqwljdlqw');

    // Get user from database
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    request.userId = user.id;

    await this.validateBookingLimits(user, request);
    this.logger.log(`Booking limits validated for user: ${user.id}`);

    // Validate seat availability
    if (request.seatIds && request.seatIds.length > 0) {
      await this.validateSeatAvailability(request.seatIds, request.showDate);
    }

    // Validate referrer
    let referrer = null;
    if (request.referrerCode) {
      // Add logger for referrer validation
      this.logger.log(`Validating referrer code: ${request.referrerCode}`);
      referrer = await this.referrerRepo.findOne({
        where: { code: request.referrerCode, isActive: true },
      });

      if (!referrer) {
        this.logger.warn(`Invalid referrer code: ${request.referrerCode}`);
        throw new BadRequestException('Invalid referrer code');
      }
    }

    // Calculate pricing
    const pricing = this.calculateOrderPricing(request);
    this.logger.log('Order pricing calculated:', pricing);

    // Create orderlog
    const orderNumber = ReferenceGenerator.generateOrderNumber();
    this.logger.log('Generated order number:', orderNumber);

    console.log('321321m3l123l12');

    // Prepare order data
    const orderData: any = {
      orderNumber,
      userId: user.id,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: request.customerEmail,
      ticketType: request.ticketType,
      quantity: request.quantity || 0,
      total: pricing.totalAmount,
      totalAmount: pricing.totalAmount,
      status: request.status || OrderStatus.PENDING,
      paymentMethod: request.paymentMethod || PaymentMethod.CASH,
      method: PaymentMethod.CASH,
      showDate: ThailandTimeHelper.toThailandTime(request.showDate),
      referrerCode: request.referrerCode,
      referrerId: referrer?.id,
      referrerCommission: pricing.commission,
      note: request.note,
      source: (request.source as OrderSource) || OrderSource.DIRECT,
      expiresAt: BusinessLogicHelper.calculateExpiryTime(
        ThailandTimeHelper.now(),
        this.configService.get(
          'RESERVATION_TIMEOUT_MINUTES',
          TIME_LIMITS.RESERVATION_MINUTES,
        ),
      ),
    };

    // ถ้าสถานะเป็น BOOKED ให้ตั้งเวลาหมดอายุเป็น 21:00 ของวันที่แสดง
    if (request.status === OrderStatus.BOOKED) {
      const showDate = ThailandTimeHelper.toThailandTime(request.showDate);
      const expiryDate =
        ThailandTimeHelper.format(showDate, 'YYYY-MM-DD') + ' 21:00:00';
      orderData.expiresAt = ThailandTimeHelper.toThailandTime(expiryDate);
      this.logger.log(
        `🕘 BOOKED order expiry set to 21:00 on show date: ${ThailandTimeHelper.toISOString(orderData.expiresAt)}`,
      );
    }

    // Handle standing tickets BEFORE saving
    if (request.ticketType === TicketType.STANDING) {
      const adultQty = request.standingAdultQty || 0;
      const childQty = request.standingChildQty || 0;

      // Validate constants
      if (
        typeof TICKET_PRICES.STANDING_ADULT !== 'number' ||
        typeof TICKET_PRICES.STANDING_CHILD !== 'number' ||
        typeof COMMISSION_RATES.STANDING_ADULT !== 'number' ||
        typeof COMMISSION_RATES.STANDING_CHILD !== 'number'
      ) {
        this.logger.error(
          `Invalid constants: TICKET_PRICES.STANDING_ADULT=${TICKET_PRICES.STANDING_ADULT}, TICKET_PRICES.STANDING_CHILD=${TICKET_PRICES.STANDING_CHILD}, COMMISSION_RATES.STANDING_ADULT=${COMMISSION_RATES.STANDING_ADULT}, COMMISSION_RATES.STANDING_CHILD=${COMMISSION_RATES.STANDING_CHILD}`,
        );
        throw new InternalServerErrorException(
          'Invalid ticket pricing or commission rates. Please contact support.',
        );
      }

      const adultTotal = adultQty * TICKET_PRICES.STANDING_ADULT;
      const childTotal = childQty * TICKET_PRICES.STANDING_CHILD;
      const standingTotal = adultTotal + childTotal;

      // Validate calculations
      if (isNaN(adultTotal) || isNaN(childTotal) || isNaN(standingTotal)) {
        throw new BadRequestException(
          'Invalid standing ticket calculations. Please check ticket quantities and pricing.',
        );
      }

      // Set standing ticket fields in order data
      orderData.standingAdultQty = adultQty;
      orderData.standingChildQty = childQty;
      orderData.standingTotal = standingTotal;
      orderData.standingCommission =
        adultQty * COMMISSION_RATES.STANDING_ADULT +
        childQty * COMMISSION_RATES.STANDING_CHILD;
      orderData.quantity = adultQty + childQty;
      orderData.total = standingTotal;
      orderData.totalAmount = standingTotal;

      // Debugging logs for standing ticket calculations
      this.logger.log(
        `Standing Adult Qty: ${adultQty}, Standing Child Qty: ${childQty}`,
      );
      this.logger.log(
        `Adult Total: ${adultTotal}, Child Total: ${childTotal}, Standing Total: ${standingTotal}`,
      );
      this.logger.log(`Standing Commission: ${orderData.standingCommission}`);
    }

    if (request.ticketType === TicketType.STANDING) {
      // ถ้าไม่ได้ระบุ status มาจากภายนอก ให้ใช้ logic เดิม
      if (!request.status) {
        if (
          ThailandTimeHelper.isSameDay(
            request.showDate,
            ThailandTimeHelper.now(),
          )
        ) {
          orderData.status = OrderStatus.PENDING;
        } else {
          orderData.status = OrderStatus.BOOKED;
        }
      }
      // ถ้าเป็น standing ticket และยังไม่ได้ตั้งค่า expiresAt จากเงื่อนไข BOOKED ข้างบน
      if (
        orderData.status === OrderStatus.BOOKED &&
        request.status !== OrderStatus.BOOKED
      ) {
        const showDate = ThailandTimeHelper.toThailandTime(request.showDate);
        const expiryDate =
          ThailandTimeHelper.format(showDate, 'YYYY-MM-DD') + ' 21:00:00';
        orderData.expiresAt = ThailandTimeHelper.toThailandTime(expiryDate);
      }
    }

    if (request.ticketType !== TicketType.STANDING) {
      request.quantity = request.seatIds?.length || 0;
    }

    orderData.quantity = request.quantity;

    const order = this.orderRepo.create(orderData);
    const savedOrderResult = await this.orderRepo.save(order);
    const savedOrder = Array.isArray(savedOrderResult)
      ? savedOrderResult[0]
      : savedOrderResult;

    if (!savedOrder) {
      throw new Error('Order not found after saving');
    }

    // Create seat bookings
    if (request.seatIds && request.seatIds.length > 0) {
      await this.createSeatBookings(
        savedOrder,
        request.seatIds,
        request.showDate,
      );
    }

    // Reload savedOrder with seatBookings relation
    const reloadedOrder = await this.orderRepo.findOne({
      where: { id: savedOrder.id },
      relations: [
        'seatBookings',
        'seatBookings.seat',
        'seatBookings.seat.zone',
      ],
    });

    if (!reloadedOrder) {
      throw new Error('Order not found after reloading');
    }

    return {
      ...reloadedOrder,
      customerName: reloadedOrder.customerName,
      ticketType: reloadedOrder.ticketType,
      price: reloadedOrder.totalAmount,
      paymentStatus: PaymentStatus.PENDING,
      showDate: ThailandTimeHelper.toISOString(reloadedOrder.showDate),
      seats:
        reloadedOrder.seatBookings?.map((booking) => {
          return {
            id: booking.seat.id,
            seatNumber: booking.seat.seatNumber,
            zone: booking.seat.zone
              ? {
                  id: booking.seat.zone.id,
                  name: booking.seat.zone.name,
                }
              : null,
          };
        }) || [],
    };
  }

  // ==============================================================
  // 🔍 FIND ALL ORDERS
  // ========================================
  async findAll(options: FindAllOptions, userId?: string): Promise<any> {
    const { page = 1, limit = 10, status, search } = options;

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

      if (status) {
        query.andWhere('order.status = :status', { status });
      }

      if (search) {
        query.andWhere(
          '(order.orderNumber LIKE :search OR order.customerName LIKE :search OR order.customerPhone LIKE :search)',
          { search: `%${search}%` },
        );
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
        items: items.map((order) => this.mapToOrderData(order)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
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
      return null;
    }

    console.log('order', order);

    // Permission check for users
    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user && user.role === UserRole.USER && order.userId !== userId) {
        throw new ForbiddenException('You can only view your own orders');
      }
    }

    return this.mapToOrderData(order);
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

    // Permission check
    if (user.role === UserRole.USER && order.userId !== userId) {
      throw new ForbiddenException('You can only update your own orders');
    }

    // Status validation
    if (
      order.status === OrderStatus.CONFIRMED &&
      user.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException('Cannot update confirmed orders');
    }

    // Update order
    await this.orderRepo.update(id, {
      ...updates,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    } as any);

    // Create audit log
    await this.createAuditLog(AuditAction.UPDATE, 'Order', id, userId, updates);

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

    // Permission check
    if (user.role === UserRole.USER && order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    // Status validation
    if (
      order.status === OrderStatus.CONFIRMED &&
      user.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException('Cannot cancel confirmed orders');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    // Cancel order
    await this.orderRepo.update(id, {
      status: OrderStatus.CANCELLED,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    });

    // Release seat bookings
    if (order.seatBookings) {
      await this.seatBookingRepo.update(
        { orderId: id },
        {
          status: BookingStatus.CANCELLED,
          updatedAt: ThailandTimeHelper.now(),
        },
      );
    }

    // Create audit log
    await this.createAuditLog(AuditAction.CANCEL, 'Order', id, userId, {
      reason: 'Order cancelled by user',
    });

    return { success: true, message: 'Order cancelled successfully' };
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

    // Only staff and admin can confirm payment
    if (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only staff and admin can confirm payments');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Can only confirm payment for pending orders',
      );
    }

    // Update order status
    await this.orderRepo.update(id, {
      status: OrderStatus.CONFIRMED,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    });

    // Update seat bookings
    if (order.seatBookings) {
      await this.seatBookingRepo.update(
        { orderId: id },
        {
          status: BookingStatus.CONFIRMED,
          updatedAt: ThailandTimeHelper.now(),
        },
      );
    }

    // Create audit log
    await this.createAuditLog(AuditAction.CONFIRM, 'Order', id, userId, {
      reason: 'Payment confirmed by staff',
    });

    return { success: true, message: 'Payment confirmed successfully' };
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

    // Permission check
    if (user.role === UserRole.USER && order.userId !== userId) {
      throw new ForbiddenException(
        'You can only generate tickets for your own orders',
      );
    }

    if (![OrderStatus.CONFIRMED, OrderStatus.PAID].includes(order.status)) {
      throw new BadRequestException(
        'Can only generate tickets for confirmed orders',
      );
    }
    console.log('order', order);

    let tickets = [];

    // Generate tickets based on ticket type
    if (order.ticketType === TicketType.STANDING) {
      // Generate tickets for standing orders
      const adultQty = order.standingAdultQty || 0;
      const childQty = order.standingChildQty || 0;

      // Generate adult tickets
      for (let i = 1; i <= adultQty; i++) {
        tickets.push({
          id: `${order.id}_adult_${i}`,
          orderNumber: order.orderNumber,
          seatNumber: null,
          type: order.ticketType,
          ticketCategory: 'ADULT',
          zone: null,
          customerName: order.customerName,
          showDate: DateTimeHelper.formatDate(order.showDate),
          qrCode: `QR_${order.orderNumber}_STANDING_ADULT_${i}`,
        });
      }

      // Generate child tickets
      for (let i = 1; i <= childQty; i++) {
        tickets.push({
          id: `${order.id}_child_${i}`,
          orderNumber: order.orderNumber,
          seatNumber: null,
          type: order.ticketType,
          ticketCategory: 'CHILD',
          zone: null,
          customerName: order.customerName,
          showDate: DateTimeHelper.formatDate(order.showDate),
          qrCode: `QR_${order.orderNumber}_STANDING_CHILD_${i}`,
        });
      }
    } else {
      // Generate tickets for seated orders (existing logic)
      tickets = order.seatBookings.map((booking) => ({
        id: booking.id,
        orderNumber: order.orderNumber,
        seatNumber: booking.seat.seatNumber,
        type: order.ticketType,
        ticketCategory: 'SEAT',
        zone: booking.seat.zone
          ? {
              id: booking.seat.zone.id,
              name: booking.seat.zone.name,
            }
          : null,
        customerName: order.customerName,
        showDate: DateTimeHelper.formatDate(order.showDate),
        qrCode: `QR_${order.orderNumber}_${booking.seat.seatNumber}`,
      }));
    }

    // Create audit log
    await this.createAuditLog(AuditAction.VIEW, 'Order', id, userId, {
      action: 'Tickets generated',
      ticketCount: tickets.length,
      ticketType: order.ticketType,
      standingAdultQty:
        order.ticketType === TicketType.STANDING
          ? order.standingAdultQty
          : undefined,
      standingChildQty:
        order.ticketType === TicketType.STANDING
          ? order.standingChildQty
          : undefined,
    });

    return { tickets, totalTickets: tickets.length };
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

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['seatBookings', 'seatBookings.seat', 'referrer', 'payment'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only staff and admin can change seats
    if (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only staff and admin can change seats');
    }

    // Validate order status
    if (
      ![OrderStatus.PENDING, OrderStatus.BOOKED, OrderStatus.PAID].includes(
        order.status,
      )
    ) {
      throw new BadRequestException(
        'Cannot change seats for orders with status: ' + order.status,
      );
    }

    // Validate ticket type
    if (order.ticketType === TicketType.STANDING) {
      throw new BadRequestException('Cannot change seats for standing tickets');
    }

    // Convert seat numbers to seat IDs
    const newSeatIds = await this.convertSeatNumbersToIds(newSeatNumbers);

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
        return await this.changePendingBookedSeats(
          order,
          newSeatIds,
          userId,
          user,
          newReferrerCode,
          newCustomerName,
          newCustomerPhone,
          newCustomerEmail,
          newShowDate,
        );

      case OrderStatus.PAID:
        return await this.changePaidSeats(
          order,
          newSeatIds,
          userId,
          user,
          currentSeatCount,
          newSeatCount,
          newShowDate,
        );

      default:
        throw new BadRequestException('Invalid order status for seat changes');
    }
  }

  /**
   * Handle seat changes for PENDING/BOOKED orders
   * - Can change seat count
   * - Can update customer info
   * - Can change referrer
   * - Can change show date
   * - Recalculate pricing
   */
  private async changePendingBookedSeats(
    order: Order,
    newSeatIds: string[],
    userId: string,
    user: User,
    newReferrerCode?: string,
    newCustomerName?: string,
    newCustomerPhone?: string,
    newCustomerEmail?: string,
    newShowDate?: string,
  ): Promise<{ success: boolean; message: string; updatedOrder?: any }> {
    this.logger.log(`🔄 Changing seats for PENDING/BOOKED order ${order.id}`);

    const oldSeatIds = order.seatBookings?.map((b) => b.seat.id) || [];
    const oldSeatCount = oldSeatIds.length;
    const newSeatCount = newSeatIds.length;

    // Determine the show date to use for validation
    const showDateToUse = newShowDate
      ? newShowDate
      : ThailandTimeHelper.formatDateTime(order.showDate, 'YYYY-MM-DDTHH:mm');

    // Validate new seat availability (excluding current order)
    await this.validateSeatAvailabilityExcludingOrder(
      newSeatIds,
      showDateToUse,
      order.id,
    );

    // Handle referrer changes
    let newReferrer = order.referrer;
    if (newReferrerCode && newReferrerCode !== order.referrerCode) {
      if (newReferrerCode === 'REMOVE') {
        newReferrer = null;
      } else {
        const referrer = await this.referrerRepo.findOne({
          where: { code: newReferrerCode, isActive: true },
        });
        if (!referrer) {
          throw new BadRequestException(
            `Invalid referrer code: ${newReferrerCode}`,
          );
        }
        newReferrer = referrer;
      }
    }

    // Calculate new pricing
    const newPricing = this.calculateSeatPricing(
      order.ticketType,
      newSeatCount,
    );
    const newCommission = newReferrer ? newPricing.commission : 0; // ✅ ใช้ commission จาก pricing

    // Update order details
    const orderUpdates: any = {
      quantity: newSeatCount,
      totalAmount: newPricing.totalAmount,
      total: newPricing.totalAmount,
      referrer: newReferrer,
      referrerId: newReferrer?.id || null,
      referrerCode: newReferrer?.code || null,
      referrerCommission: newCommission,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    };

    // Update customer info if provided
    if (newCustomerName && newCustomerName !== order.customerName) {
      orderUpdates.customerName = newCustomerName;
    }
    if (newCustomerPhone && newCustomerPhone !== order.customerPhone) {
      orderUpdates.customerPhone = newCustomerPhone;
    }
    if (newCustomerEmail && newCustomerEmail !== order.customerEmail) {
      orderUpdates.customerEmail = newCustomerEmail;
    }

    if (
      newShowDate &&
      !ThailandTimeHelper.isSameDay(newShowDate, order.showDate)
    ) {
      orderUpdates.showDate = ThailandTimeHelper.toThailandTime(newShowDate);
    }

    // Remove old seat bookings
    if (order.seatBookings?.length > 0) {
      await this.seatBookingRepo.delete({ orderId: order.id });
    }

    // Create new seat bookings
    await this.createSeatBookings(order, newSeatIds, showDateToUse);

    // Update order
    await this.orderRepo.update(order.id, orderUpdates);

    // Create audit log
    await this.createAuditLog(AuditAction.UPDATE, 'Order', order.id, userId, {
      action: 'Seats changed (PENDING/BOOKED)',
      oldSeats: oldSeatIds,
      newSeats: newSeatIds,
      oldSeatCount,
      newSeatCount,
      oldAmount: order.totalAmount,
      newAmount: newPricing.totalAmount,
      oldReferrer: order.referrerCode,
      newReferrer: newReferrer?.code,
      oldShowDate: ThailandTimeHelper.formatDateTime(
        order.showDate,
        'YYYY-MM-DD HH:mm:ss',
      ),
      newShowDate: newShowDate
        ? ThailandTimeHelper.formatDateTime(newShowDate, 'YYYY-MM-DD HH:mm:ss')
        : ThailandTimeHelper.formatDateTime(
            order.showDate,
            'YYYY-MM-DD HH:mm:ss',
          ),
      customerUpdates: {
        name:
          newCustomerName !== order.customerName ? newCustomerName : undefined,
        phone:
          newCustomerPhone !== order.customerPhone
            ? newCustomerPhone
            : undefined,
        email:
          newCustomerEmail !== order.customerEmail
            ? newCustomerEmail
            : undefined,
      },
    });

    const updatedOrder = await this.findById(order.id);

    return {
      success: true,
      message: `Seats changed successfully. ${oldSeatCount} → ${newSeatCount} seats. Amount: ฿${order.totalAmount} → ฿${newPricing.totalAmount}`,
      updatedOrder,
    };
  }

  /**
   * Handle seat changes for PAID orders
   * - Can only change to same or fewer seats
   * - Cannot change pricing or referrer
   * - Cannot change customer info
   * - Can change show date
   */
  private async changePaidSeats(
    order: Order,
    newSeatIds: string[],
    userId: string,
    user: User,
    currentSeatCount: number,
    newSeatCount: number,
    newShowDate?: string,
  ): Promise<{ success: boolean; message: string; updatedOrder?: any }> {
    this.logger.log(`🔄 Changing seats for PAID order ${order.id}`);

    // Validate seat count (cannot exceed paid seats)
    if (newSeatCount > currentSeatCount) {
      throw new BadRequestException(
        `Cannot increase seat count for paid order. Current: ${currentSeatCount}, Requested: ${newSeatCount}`,
      );
    }

    const oldSeatIds = order.seatBookings?.map((b) => b.seat.id) || [];

    // Determine the show date to use for validation

    const showDateToUse = newShowDate
      ? newShowDate
      : ThailandTimeHelper.toISOString(order.showDate);

    // Validate new seat availability (excluding current order)
    await this.validateSeatAvailabilityExcludingOrder(
      newSeatIds,
      showDateToUse,
      order.id,
    );

    // Remove old seat bookings
    if (order.seatBookings?.length > 0) {
      await this.seatBookingRepo.delete({ orderId: order.id });
    }

    // Create new seat bookings with PAID status
    const seats = await this.seatRepo.findByIds(newSeatIds);
    const newBookings = seats.map((seat) => ({
      order,
      orderId: order.id,
      seat,
      showDate: showDateToUse,
      status: BookingStatus.PAID, // Keep PAID status
      createdAt: ThailandTimeHelper.now(),
      updatedAt: ThailandTimeHelper.now(),
    }));

    await this.seatBookingRepo.save(newBookings);

    // Update order if seat count or show date changed
    const orderUpdates: any = {};
    let hasUpdates = false;

    if (newSeatCount !== currentSeatCount) {
      orderUpdates.quantity = newSeatCount;
      hasUpdates = true;
    }

    if (
      newShowDate &&
      !ThailandTimeHelper.isSameDay(newShowDate, order.showDate)
    ) {
      orderUpdates.showDate = ThailandTimeHelper.toThailandTime(newShowDate);
      hasUpdates = true;
    }

    if (hasUpdates) {
      orderUpdates.updatedAt = ThailandTimeHelper.now();
      orderUpdates.updatedBy = userId;
      await this.orderRepo.update(order.id, orderUpdates);
    }

    // Create audit log
    await this.createAuditLog(AuditAction.UPDATE, 'Order', order.id, userId, {
      action: 'Seats changed (PAID)',
      oldSeats: oldSeatIds,
      newSeats: newSeatIds,
      oldSeatCount: currentSeatCount,
      newSeatCount,
      oldShowDate: ThailandTimeHelper.toISOString(order.showDate),
      newShowDate:
        newShowDate || ThailandTimeHelper.toISOString(order.showDate),
      note: 'Paid order - pricing unchanged',
    });

    const updatedOrder = await this.findById(order.id);

    let message = `Seats changed successfully for paid order.`;
    if (newSeatCount < currentSeatCount) {
      message += ` Reduced from ${currentSeatCount} to ${newSeatCount} seats.`;
    } else {
      message += ` ${newSeatCount} seats maintained.`;
    }

    return {
      success: true,
      message,
      updatedOrder,
    };
  }

  /**
   * Calculate pricing for seated tickets
   */
  private calculateSeatPricing(
    ticketType: TicketType,
    seatCount: number,
  ): {
    totalAmount: number;
    commission: number;
  } {
    const pricePerSeat = TICKET_PRICES[ticketType];

    if (typeof pricePerSeat !== 'number') {
      throw new InternalServerErrorException(
        `Invalid ticket price for type: ${ticketType}`,
      );
    }

    const totalAmount = seatCount * pricePerSeat;
    // ✅ ใช้ commission ตามประเภทที่นั่ง
    const commission = seatCount * COMMISSION_RATES.SEAT; // 400 บาท/ตั๋ว

    return { totalAmount, commission };
  }

  // =============================================================
  // 📊 ORDER STATISTICS
  // ==============================================
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

    // Create audit log
    await this.createAuditLog(AuditAction.DELETE, 'Order', id, userId, {
      reason: 'Order removed by admin',
    });

    return { success: true, message: 'Order removed successfully' };
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
  private async validateBookingLimits(
    user: User,
    request: CreateOrderRequest,
  ): Promise<void> {
    const limits = BOOKING_LIMITS[user.role];
    const totalSeats = (request.quantity || 0) + (request.seatIds?.length || 0);

    this.logger.log(
      `Validating booking limits for user: ${user.id}, role: ${user.role}, totalSeats: ${totalSeats}`,
    );

    if (totalSeats > limits.maxSeatsPerOrder) {
      this.logger.warn(
        `User ${user.id} exceeded max seats per order: ${totalSeats} > ${limits.maxSeatsPerOrder}`,
      );
      throw new ForbiddenException(
        `${user.role} สามารถจองได้สูงสุด ${limits.maxSeatsPerOrder} ที่นั่งต่อคำสั่ง`,
      );
    }

    const today = ThailandTimeHelper.startOfDay(ThailandTimeHelper.now());
    const todayOrders = await this.orderRepo.count({
      where: {
        userId: user.id,
        createdAt: Between(today, ThailandTimeHelper.now()),
      },
    });

    this.logger.log(
      `User ${user.id} has made ${todayOrders} orders today, max allowed: ${limits.maxOrdersPerDay}`,
    );

    if (todayOrders >= limits.maxOrdersPerDay) {
      this.logger.warn(
        `User ${user.id} exceeded max orders per day: ${todayOrders} >= ${limits.maxOrdersPerDay}`,
      );
      throw new ForbiddenException(
        `${user.role} สามารถทำรายการได้สูงสุด ${limits.maxOrdersPerDay} ครั้งต่อวัน`,
      );
    }
  }

  private async validateSeatAvailability(
    seatIds: string[],
    showDate: string,
  ): Promise<void> {
    const seats = await this.seatRepo.findByIds(seatIds);

    if (!seats || seats.length !== seatIds.length) {
      throw new BadRequestException('ไม่พบที่นั่งบางที่');
    }

    const bookedSeats = await this.seatBookingRepo.find({
      where: {
        seat: { id: In(seatIds) },
        showDate: showDate,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
      },
    });

    if (bookedSeats.length > 0) {
      throw new BadRequestException('Some seats are already booked');
    }
  }

  private calculateOrderPricing(request: CreateOrderRequest): {
    totalAmount: number;
    commission: number;
  } {
    const { ticketType, quantity = 0, seatIds = [] } = request;

    let pricePerSeat;
    let commissionPerTicket;

    if (ticketType === TicketType.STANDING) {
      pricePerSeat = TICKET_PRICES.STANDING_ADULT;
      commissionPerTicket = COMMISSION_RATES.STANDING_ADULT; // 300 บาท/ตั๋ว
    } else {
      pricePerSeat = TICKET_PRICES[ticketType];
      commissionPerTicket = COMMISSION_RATES.SEAT; // 400 บาท/ตั๋ว
    }

    const totalSeats = quantity + seatIds.length;

    // Validate constants
    if (
      typeof pricePerSeat !== 'number' ||
      typeof commissionPerTicket !== 'number'
    ) {
      this.logger.error(
        `Invalid constants: pricePerSeat=${pricePerSeat}, commissionPerTicket=${commissionPerTicket}`,
      );
      throw new InternalServerErrorException(
        'Invalid ticket pricing or commission rates. Please contact support.',
      );
    }

    this.logger.log(`Calculating pricing for ticketType: ${ticketType}`);
    this.logger.log(`TICKET_PRICES: ${JSON.stringify(TICKET_PRICES)}`);
    this.logger.log(`COMMISSION_RATES: ${JSON.stringify(COMMISSION_RATES)}`);

    const totalAmount = totalSeats * pricePerSeat;
    console.log('totalAmount', totalAmount);

    const commission = totalSeats * commissionPerTicket; // ✅ คูณจำนวนตั๋ว × commission ต่อตั๋ว
    console.log('commission', commission);

    return { totalAmount, commission };
  }

  private async createSeatBookings(
    order: Order,
    seatIds: string[],
    showDate: string,
  ): Promise<void> {
    const seats = await this.seatRepo.findByIds(seatIds);

    const bookings = seats.map((seat) => ({
      order,
      orderId: order.id,
      seat,
      showDate: showDate,
      status: BookingStatus.PENDING,
      createdAt: ThailandTimeHelper.now(),
      updatedAt: ThailandTimeHelper.now(),
    }));

    await this.seatBookingRepo.save(bookings);
  }

  private async createAuditLog(
    action: AuditAction,
    entityType: string,
    entityId: string,
    userId: string,
    metadata?: any,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const auditLog = this.auditRepo.create({
      action,
      entityType,
      entityId,
      userId,
      userRole: user.role, // Assign user role
      metadata,
      timestamp: ThailandTimeHelper.now(),
    } as AuditLog);

    await this.auditRepo.save(auditLog);
  }

  private mapToOrderData(order: Order): OrderData {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      email: order.customerEmail,
      ticketType: order.ticketType,
      quantity: order.quantity,
      price: order.totalAmount,
      totalAmount: order.totalAmount,
      status: order.status,
      referrerCommission: order.referrerCommission,
      paymentMethod: order.paymentMethod || PaymentMethod.CASH,
      paymentStatus: order?.payment?.status || PaymentStatus.PENDING,
      showDate: DateTimeHelper.formatDate(order.showDate),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      expiresAt: order.expiresAt,
      source: order.source,
      note: order.note,
      createdBy: order.userId,
      updatedBy: order.updatedBy,
      standingAdultQty: order.standingAdultQty,
      standingChildQty: order.standingChildQty,
      standingTotal: order.standingTotal,
      standingCommission: order.standingCommission,
      referrer: order.referrer
        ? {
            id: order.referrer.id,
            code: order.referrer.code,
            name: order.referrer.name,
          }
        : null,
      seats:
        order.seatBookings?.map((booking) => {
          return {
            id: booking.seat.id,
            seatNumber: booking.seat.seatNumber,
            zone: booking.seat.zone
              ? {
                  id: booking.seat.zone.id,
                  name: booking.seat.zone.name,
                }
              : null,
          };
        }) || [],
    };
  }

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

    // Permission check
    if (user.role === UserRole.USER && order.userId !== userId) {
      throw new ForbiddenException('You can only update your own orders');
    }

    // Status validation
    if (
      order.status === OrderStatus.CONFIRMED &&
      user.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException('Cannot update confirmed orders');
    }

    // Update order
    await this.orderRepo.update(id, {
      ...updates,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    } as any);

    // Create audit log
    await this.createAuditLog(AuditAction.UPDATE, 'Order', id, userId, updates);

    return this.findById(id);
  }

  // =================================================================
  // 🔄 CONVERT SEAT NUMBERS TO IDS
  // =================================================================
  private async convertSeatNumbersToIds(
    seatNumbers: string[],
  ): Promise<string[]> {
    this.logger.log(
      `🔄 Converting seat numbers to IDs: ${seatNumbers.join(', ')}`,
    );

    const seats = await this.seatRepo.find({
      where: { seatNumber: In(seatNumbers) },
      select: ['id', 'seatNumber'],
    });

    if (seats.length !== seatNumbers.length) {
      const foundSeatNumbers = seats.map((seat) => seat.seatNumber);
      const missingSeatNumbers = seatNumbers.filter(
        (num) => !foundSeatNumbers.includes(num),
      );
      throw new BadRequestException(
        `ไม่พบหมายเลขที่นั่งต่อไปนี้: ${missingSeatNumbers.join(', ')}`,
      );
    }

    const seatIds = seats.map((seat) => seat.id);
    this.logger.log(`✅ Converted seat numbers to IDs: ${seatIds.join(', ')}`);

    return seatIds;
  }

  // =================================================================
  // 🔄 VALIDATE SEAT AVAILABILITY EXCLUDING CURRENT ORDER
  // =================================================================
  private async validateSeatAvailabilityExcludingOrder(
    seatIds: string[],
    showDate: string,
    currentOrderId: string,
  ): Promise<void> {
    this.logger.log(
      `🔄 Validating seat availability excluding order: ${currentOrderId}`,
    );

    const seats = await this.seatRepo.findByIds(seatIds);

    if (!seats || seats.length !== seatIds.length) {
      throw new BadRequestException('ไม่พบที่นั่งบางที่');
    }

    const bookedSeats = await this.seatBookingRepo.find({
      where: {
        seat: { id: In(seatIds) },
        showDate: showDate,
        status: In([
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.PAID,
        ]),
      },
      relations: ['order'],
    });

    // Filter out bookings from the current order
    const conflictingBookings = bookedSeats.filter(
      (booking) => booking.order.id !== currentOrderId,
    );

    if (conflictingBookings.length > 0) {
      const conflictingSeatNumbers = await Promise.all(
        conflictingBookings.map(async (booking) => {
          const seat = await this.seatRepo.findOne({
            where: { id: booking.seat.id },
          });
          return seat?.seatNumber || booking.seat.id;
        }),
      );

      throw new BadRequestException(
        `ที่นั่งหมายเลข ${conflictingSeatNumbers.join(', ')} ถูกจองไปแล้วในวันที่แสดงนี้`,
      );
    }

    this.logger.log(`✅ All seats are available for the show date`);
  }
}
