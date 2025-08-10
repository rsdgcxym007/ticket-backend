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
  PaymentStatus,
  TicketType,
  BookingStatus,
  AuditAction,
  OrderPurchaseType,
} from '../common/enums';

// ========================================
// 🛠️ UTILITIES & HELPERS
// ========================================
import {
  ThailandTimeHelper,
  LoggingHelper,
  ErrorHandlingHelper,
} from '../common/utils';

// ========================================
// 🔧 SERVICES
// ========================================
import { SeatBookingService } from '../common/services/seat-booking.service';
import { AuditHelperService } from '../common/services/audit-helper.service';
import { OrderBusinessService } from './services/order-business.service';

// ========================================
// 📊 MAPPERS & TYPES
// ========================================
import { OrderData } from './mappers/order-data.mapper';

// ========================================
// 🔄 LEGACY HELPERS (for backward compatibility)
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
  // Hotel booking fields
  hotelName?: string;
  hotelDistrict?: string;
  roomNumber?: string;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
  voucherNumber?: string; // เพิ่ม voucherNumber
  pickupScheduledTime?: string;
  bookerName?: string;
  includesPickup?: boolean;
  includesDropoff?: boolean;
  // Pickup/Dropoff fields
  requiresPickup?: boolean;
  requiresDropoff?: boolean;
  pickupHotel?: string;
  dropoffLocation?: string;
  pickupTime?: string;
  dropoffTime?: string;
  travelDate?: string;
  voucherCode?: string;
  referenceNo?: string;
  specialRequests?: string;
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
    private orderBusinessService: OrderBusinessService,
  ) {
    // Add console.log to verify logger initialization
  }

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
        if (Array.isArray(status)) {
          query.andWhere('order.status IN (:...status)', { status });
        } else if (typeof status === 'string' && status.includes(',')) {
          const statusArr = status
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          query.andWhere('order.status IN (:...status)', { status: statusArr });
        } else {
          query.andWhere('order.status = :status', { status });
        }
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
        let keywords: string[] = [];
        if (typeof search === 'string' && search.includes(',')) {
          keywords = search
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          keywords = [search.trim()];
        }
        // สร้างเงื่อนไข OR สำหรับแต่ละ keyword ในทุก field
        const searchConds: string[] = [];
        const params: any = {};
        keywords.forEach((kw, idx) => {
          const param = `search${idx}`;
          params[param] = `%${kw.toLowerCase()}%`;
          searchConds.push(
            `(LOWER(order.orderNumber) LIKE :${param} OR LOWER(order.customerName) LIKE :${param} OR LOWER(order.customerPhone) LIKE :${param} OR LOWER(order.voucherNumber) LIKE :${param} OR LOWER(order.hotelName) LIKE :${param})`,
          );
        });
        query.andWhere(searchConds.join(' OR '), params);
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
      if (limit !== -1) {
        query.skip((page - 1) * limit).take(limit);
      }

      const [items, total] = await query.getManyAndCount();
      contextLogger.logWithContext('info', 'Orders found successfully', {
        total,
        page,
        totalPages: limit === -1 ? 1 : Math.ceil(total / limit),
      });
      // เพิ่ม payment ข้อมูลในแต่ละ order
      const mappedOrders = this.orderBusinessService
        .transformOrdersToData(items)
        .map((order, idx) => {
          const payment = items[idx]?.payment;
          return {
            ...order,
            payment: payment
              ? {
                  status: payment.status || '-',
                  amount: payment.amount || 0,
                  method: payment.method || '-',
                  // transactionId: payment.transactionId || '-', // Removed, not in Payment entity
                }
              : undefined,
          };
        });
      return {
        items: mappedOrders,
        total,
        page,
        limit,
        totalPages: limit === -1 ? 1 : Math.ceil(total / limit),
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

    return this.orderBusinessService.transformOrderToData(order);
  }
  async update(
    id: string,
    updates: Partial<OrderData>,
    userId: string,
  ): Promise<OrderData> {
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

    // 🧮 คำนวณ Outstanding Amount อัตโนมัติหากมีการเปลี่ยนแปลงข้อมูลที่เกี่ยวข้อง
    const shouldRecalculateOutstanding =
      updates.quantity !== undefined ||
      updates.standingAdultQty !== undefined ||
      updates.standingChildQty !== undefined ||
      updates.ticketType !== undefined;

    if (shouldRecalculateOutstanding) {
      try {
        // คำนวณ Outstanding Amount ใหม่หลังจากอัปเดต
        const updatedOrder = await this.orderRepo.findOne({
          where: { id },
          relations: ['seatBookings'],
        });

        if (updatedOrder) {
          // คำนวณ Outstanding Amount โดยตรงตามสูตร
          const standingQty = updatedOrder.standingAdultQty || 0;
          const standingChildQty = updatedOrder.standingChildQty || 0;
          const ringsideQty =
            updatedOrder.ticketType === TicketType.RINGSIDE
              ? updatedOrder.quantity || 0
              : 0;
          const stadiumQty =
            updatedOrder.ticketType === TicketType.STADIUM
              ? updatedOrder.quantity || 0
              : 0;

          const rsQty = ringsideQty + stadiumQty;
          const stdQty = standingQty;
          const stdchQty = standingChildQty;
          const totalGuests = rsQty + stdQty + stdchQty;

          // คำนวณราคามวยรวม
          const rsPrice = 1400;
          const stdPrice = 1200;
          const stdchPrice = 1000;
          const shirtPrice = 300;

          const rsBoxingPrice = rsQty * rsPrice;
          const stdBoxingPrice = stdQty * stdPrice;
          const stdchBoxingPrice = stdchQty * stdchPrice;
          const totalBoxingPrice =
            rsBoxingPrice + stdBoxingPrice + stdchBoxingPrice;

          // คำนวณค่าเสื้อรวม
          const totalShirtPrice = totalGuests * shirtPrice;

          // เงินทัวร์ = ราคามวยรวม - ค่าเสื้อรวม
          const calculatedOutstanding = totalBoxingPrice - totalShirtPrice;

          await this.orderRepo.update(id, {
            outstandingAmount: calculatedOutstanding,
          });
        }
      } catch (error) {
        // Log error แต่ไม่ throw เพื่อไม่ให้กระทบกับกระบวนการหลัก
        this.logger.error(
          `Failed to update outstanding amount after order change for ${id}`,
          error,
        );
      }
    }

    // Create audit log ใช้ AuditHelperService
    await this.auditHelperService.auditOrderAction(
      AuditAction.UPDATE,
      id,
      userId,
      this.auditHelperService.createOrderUpdateMetadata(order, updates),
    );

    return this.findById(id);
  }
  async cancel(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
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

  async confirmPayment(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
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

  async generateTickets(id: string, userId: string): Promise<any> {
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

    // Permission check ใช้ OrderBusinessService
    this.orderBusinessService.validateTicketGeneration(user, order);

    console.log('order', order);

    // Generate tickets ใช้ OrderBusinessService
    const ticketData = this.orderBusinessService.generateTicketData(order);

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

  async changeSeats(
    id: string,
    updateData: {
      seatIds?: string[];
      newSeatNumbers?: string[];
      newReferrerCode?: string;
      newCustomerName?: string;
      newCustomerPhone?: string;
      newCustomerEmail?: string;
      newShowDate?: string;
      newSource?: string;
      hotelName?: string;
      hotelDistrict?: string;
      roomNumber?: string;
      adultCount?: number;
      childCount?: number;
      infantCount?: number;
      voucherNumber?: string;
      pickupScheduledTime?: string;
      bookerName?: string;
      includesPickup?: boolean;
      includesDropoff?: boolean;
      requiresPickup?: boolean;
      requiresDropoff?: boolean;
      pickupHotel?: string;
      dropoffLocation?: string;
      pickupTime?: string;
      dropoffTime?: string;
      voucherCode?: string;
      referenceNo?: string;
      specialRequests?: string;
      paymentAmount?: string | number;
    },
    userId: string,
  ): Promise<{ success: boolean; message: string; updatedOrder?: any }> {
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

      // ตรวจสอบเงื่อนไขการอัพเดทตาม payment status
      const isPaymentPaid = order.payment?.status === PaymentStatus.PAID;
      const isSeatedTicket =
        order.ticketType === TicketType.RINGSIDE ||
        order.ticketType === TicketType.STADIUM;

      // ตรวจสอบเงื่อนไขการเปลี่ยนที่นั่งสำหรับ PAID orders
      let filteredUpdateData = { ...updateData };
      let seatLimitMessage = '';

      if (isPaymentPaid && isSeatedTicket) {
        // ตั๋วนั่งที่ PAID แล้ว: ตัดจำนวนที่นั่งถ้าเกินและกรองข้อมูลที่อนุญาต

        // Extract seat numbers first for checking
        const originalSeatNumbers =
          updateData.newSeatNumbers || updateData.seatIds || [];

        // ตัดจำนวนที่นั่งถ้าเกินจำนวนที่ซื้อมา
        const currentSeatCount = order.seatBookings?.length || 0;
        if (originalSeatNumbers.length > currentSeatCount) {
          const limitedSeatNumbers = originalSeatNumbers.slice(
            0,
            currentSeatCount,
          );
          filteredUpdateData.newSeatNumbers = limitedSeatNumbers;
          filteredUpdateData.seatIds = limitedSeatNumbers;
          seatLimitMessage = ` (ตัดจำนวนที่นั่งเหลือ ${currentSeatCount} ที่ตามที่ซื้อมา)`;
        }

        // กรองข้อมูลที่อนุญาตเท่านั้น (เฉพาะที่นั่งและวันที่แสดง)
        const allowedKeys = ['seatIds', 'newSeatNumbers', 'newShowDate'];
        filteredUpdateData = Object.keys(filteredUpdateData)
          .filter((key) => allowedKeys.includes(key))
          .reduce((obj, key) => {
            obj[key] = filteredUpdateData[key];
            return obj;
          }, {});
      }

      // Extract seat numbers from filteredUpdateData (support both seatIds and newSeatNumbers for backward compatibility)
      const newSeatNumbers =
        filteredUpdateData.newSeatNumbers || filteredUpdateData.seatIds || [];

      // Convert seat numbers to seat IDs - use helper
      const newSeatIds = await OrderValidationHelper.convertSeatNumbersToIds(
        newSeatNumbers,
        this.seatRepo,
      );

      // Get current seat count
      const currentSeatCount = order.seatBookings?.length || 0;
      const newSeatCount = newSeatIds.length;

      // สร้าง updateFields object สำหรับการอัพเดทข้อมูลเพิ่มเติม
      const updateFields: any = {
        updatedAt: ThailandTimeHelper.now(),
        updatedBy: userId,
      };

      // อัพเดทข้อมูลลูกค้าถ้ามีการส่งมา
      if (filteredUpdateData.newCustomerName !== undefined) {
        updateFields.customerName = filteredUpdateData.newCustomerName;
      }
      if (filteredUpdateData.newCustomerPhone !== undefined) {
        updateFields.customerPhone = filteredUpdateData.newCustomerPhone;
      }
      if (filteredUpdateData.newCustomerEmail !== undefined) {
        updateFields.customerEmail = filteredUpdateData.newCustomerEmail;
      }
      if (filteredUpdateData.newShowDate !== undefined) {
        updateFields.showDate = filteredUpdateData.newShowDate;
      }
      if (filteredUpdateData.newSource !== undefined) {
        updateFields.source = filteredUpdateData.newSource;
      }
      if (filteredUpdateData.hotelName !== undefined) {
        updateFields.hotelName = filteredUpdateData.hotelName;
      }
      if (filteredUpdateData.hotelDistrict !== undefined) {
        updateFields.hotelDistrict = filteredUpdateData.hotelDistrict;
      }
      if (filteredUpdateData.roomNumber !== undefined) {
        updateFields.roomNumber = filteredUpdateData.roomNumber;
      }
      if (filteredUpdateData.adultCount !== undefined) {
        updateFields.adultCount = filteredUpdateData.adultCount;
      }
      if (filteredUpdateData.childCount !== undefined) {
        updateFields.childCount = filteredUpdateData.childCount;
      }
      if (filteredUpdateData.infantCount !== undefined) {
        updateFields.infantCount = filteredUpdateData.infantCount;
      }
      if (filteredUpdateData.voucherNumber !== undefined) {
        updateFields.voucherNumber = filteredUpdateData.voucherNumber;
      }
      if (filteredUpdateData.pickupScheduledTime !== undefined) {
        updateFields.pickupScheduledTime =
          filteredUpdateData.pickupScheduledTime;
      }
      if (filteredUpdateData.bookerName !== undefined) {
        updateFields.bookerName = filteredUpdateData.bookerName;
      }
      if (filteredUpdateData.includesPickup !== undefined) {
        updateFields.includesPickup = filteredUpdateData.includesPickup;
      }
      if (filteredUpdateData.includesDropoff !== undefined) {
        updateFields.includesDropoff = filteredUpdateData.includesDropoff;
      }
      if (filteredUpdateData.requiresPickup !== undefined) {
        updateFields.requiresPickup = filteredUpdateData.requiresPickup;
      }
      if (filteredUpdateData.requiresDropoff !== undefined) {
        updateFields.requiresDropoff = filteredUpdateData.requiresDropoff;
      }
      if (filteredUpdateData.pickupHotel !== undefined) {
        updateFields.pickupHotel = filteredUpdateData.pickupHotel;
      }
      if (filteredUpdateData.dropoffLocation !== undefined) {
        updateFields.dropoffLocation = filteredUpdateData.dropoffLocation;
      }
      if (filteredUpdateData.pickupTime !== undefined) {
        updateFields.pickupTime = filteredUpdateData.pickupTime;
      }
      if (filteredUpdateData.dropoffTime !== undefined) {
        updateFields.dropoffTime = filteredUpdateData.dropoffTime;
      }
      if (filteredUpdateData.voucherCode !== undefined) {
        updateFields.voucherCode = filteredUpdateData.voucherCode;
      }
      if (filteredUpdateData.referenceNo !== undefined) {
        updateFields.referenceNo = filteredUpdateData.referenceNo;
      }
      if (filteredUpdateData.specialRequests !== undefined) {
        updateFields.specialRequests = filteredUpdateData.specialRequests;
      }

      // จัดการ referrer ถ้ามีการส่ง newReferrerCode มา
      let newReferrerCommission = 0;
      let newStandingCommission = 0;

      if (filteredUpdateData.newReferrerCode !== undefined) {
        if (filteredUpdateData.newReferrerCode) {
          const referrer = await this.referrerRepo.findOne({
            where: { code: filteredUpdateData.newReferrerCode },
          });
          if (referrer) {
            updateFields.referrerId = referrer.id;

            // ตรวจสอบว่าเป็นออเดอร์ที่ payment ไม่ใช่ PAID และ paymentAmount เท่ากับ totalAmount
            if (
              !isPaymentPaid &&
              filteredUpdateData.paymentAmount !== undefined
            ) {
              const paymentAmount =
                typeof filteredUpdateData.paymentAmount === 'string'
                  ? parseFloat(filteredUpdateData.paymentAmount)
                  : filteredUpdateData.paymentAmount;

              // ตรวจสอบว่า paymentAmount เท่ากับ totalAmount หรือไม่
              if (Math.abs(paymentAmount - order.totalAmount) < 0.01) {
                // คำนวณ commission ตามประเภทตั๋ว
                if (isSeatedTicket) {
                  // ตั๋วนั่ง: referrerCommission 400 ต่อที่นั่ง
                  const seatCount = order.quantity || 0;
                  newReferrerCommission = seatCount * 400;
                } else {
                  // ตั๋วยืน: standingCommission 300 ต่อตั๋ว (ไม่ว่าเด็กหรือผู้ใหญ่)
                  const standingAdultQty = order.standingAdultQty || 0;
                  const standingChildQty = order.standingChildQty || 0;
                  const totalStandingTickets =
                    standingAdultQty + standingChildQty;
                  newStandingCommission = totalStandingTickets * 300;
                }

                // อัพเดท commission ใน updateFields
                updateFields.referrerCommission = newReferrerCommission;
                updateFields.standingCommission = newStandingCommission;
              }
            }
          }
        } else {
          updateFields.referrerId = null;
          // ถ้าลบ referrer ให้ reset commission เป็น 0
          updateFields.referrerCommission = 0;
          updateFields.standingCommission = 0;
        }
      }

      // จัดการ paymentAmount และตรวจสอบสถานะการชำระเงิน
      let shouldUpdatePaymentStatus = false;
      if (filteredUpdateData.paymentAmount !== undefined) {
        const paymentAmount =
          typeof filteredUpdateData.paymentAmount === 'string'
            ? parseFloat(filteredUpdateData.paymentAmount)
            : filteredUpdateData.paymentAmount;

        // อัพเดท payment.amount
        if (order.payment) {
          await this.paymentRepo.update(order.payment.id, {
            amount: paymentAmount,
            updatedAt: ThailandTimeHelper.now(),
          });
        } else {
          // สร้าง payment record ใหม่ถ้ายังไม่มี
          const newPayment = this.paymentRepo.create({
            amount: paymentAmount,
            status: PaymentStatus.PENDING,
            method: order.paymentMethod || PaymentMethod.CASH,
            createdAt: ThailandTimeHelper.now(),
            updatedAt: ThailandTimeHelper.now(),
          });
          const savedPayment = await this.paymentRepo.save(newPayment);

          // อัพเดต order ให้ลิงค์กับ payment ใหม่
          await this.orderRepo.update(order.id, {
            payment: savedPayment,
          });
        }

        // ตรวจสอบว่า paymentAmount เท่ากับ totalAmount หรือไม่
        if (Math.abs(paymentAmount - order.totalAmount) < 0.01) {
          // ใช้ tolerance สำหรับเลขทศนิยม
          shouldUpdatePaymentStatus = true;
          updateFields.status = OrderStatus.PAID;
        }
      }

      // อัพเดทข้อมูล order พื้นฐาน
      await this.orderRepo.update(id, updateFields);

      // อัพเดท payment status ถ้าจำเป็น
      if (shouldUpdatePaymentStatus && order.payment) {
        await this.paymentRepo.update(order.payment.id, {
          status: PaymentStatus.PAID,
          updatedAt: ThailandTimeHelper.now(),
        });
      }

      // Handle different order statuses for seat changes
      if (newSeatNumbers.length > 0) {
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
              filteredUpdateData.newReferrerCode,
              filteredUpdateData.newCustomerName,
              filteredUpdateData.newCustomerPhone,
              filteredUpdateData.newCustomerEmail,
              filteredUpdateData.newShowDate,
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
              filteredUpdateData.newShowDate,
            );

          default:
            // ถ้าไม่มีการเปลี่ยนที่นั่งแต่มีการอัพเดทข้อมูลอื่น ๆ
            break;
        }
      }

      // Create audit log สำหรับการอัพเดท
      await this.auditHelperService.auditOrderAction(
        AuditAction.UPDATE,
        id,
        userId,
        {
          ...updateFields,
          paymentAmount: filteredUpdateData.paymentAmount,
          statusChanged: shouldUpdatePaymentStatus,
          newReferrerCode: filteredUpdateData.newReferrerCode,
          commissionUpdated:
            newReferrerCommission > 0 || newStandingCommission > 0,
          newReferrerCommission,
          newStandingCommission,
          filteredData:
            isPaymentPaid && isSeatedTicket
              ? 'ตัดข้อมูลที่ไม่อนุญาต'
              : undefined,
        },
      );

      // คืนค่าผลลัพธ์
      const updatedOrder = await this.findById(id);

      // สร้าง message ตามการเปลี่ยนแปลงที่เกิดขึ้น
      let message = 'อัพเดทข้อมูลสำเร็จ';

      if (shouldUpdatePaymentStatus) {
        message = 'อัพเดทข้อมูลสำเร็จและเปลี่ยนสถานะเป็น PAID';
      }

      if (newReferrerCommission > 0 || newStandingCommission > 0) {
        const commissionInfo = [];
        if (newReferrerCommission > 0) {
          commissionInfo.push(
            `คอมมิชชั่นที่นั่ง: ${newReferrerCommission} บาท`,
          );
        }
        if (newStandingCommission > 0) {
          commissionInfo.push(`คอมมิชชั่นยืน: ${newStandingCommission} บาท`);
        }
        message += ` และอัพเดทคอมมิชชั่น (${commissionInfo.join(', ')})`;
      }

      // เพิ่ม seatLimitMessage ถ้ามี
      if (seatLimitMessage) {
        message += seatLimitMessage;
      }

      return {
        success: true,
        message,
        updatedOrder,
      };
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
  async remove(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
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
    }
  }

  async updateStandingOrder(
    id: string,
    updates: Partial<OrderData>,
    userId: string,
  ): Promise<OrderData> {
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
        id: order.id, // เพิ่ม id สำหรับการกรองใน export-spreadsheet
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
        voucherNumber: order.voucherNumber || '-',
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
        // เพิ่มข้อมูล payment
        paymentStatus: order.payment?.status || '-',
        paymentAmount: order.payment?.amount || 0,
        paymentMethodDetail: order.payment?.method || '-',
        paymentTransactionId: order.payment?.transactionId || '-',
      }));

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

  async generateOrdersPDF(exportData: {
    orders: any[];
    summary: any;
    metadata: any;
  }): Promise<Buffer> {
    try {
      // 📊 กำหนด PaymentMethod Header
      const paymentMethodHeader = 'ยอดเงิน'; // ค่าเริ่มต้น
      if (exportData.metadata?.filters?.paymentMethod) {
        // const method = exportData.metadata.filters.paymentMethod;
        // switch (method.toUpperCase()) {
        //   case 'CASH':
        //     paymentMethodHeader = 'เงินสด';
        //     break;
        //   case 'CREDIT_CARD':
        //     paymentMethodHeader = 'บัตรเครดิต';
        //     break;
        //   case 'BANK_TRANSFER':
        //     paymentMethodHeader = 'โอนเงิน';
        //     break;
        //   case 'QR_CODE':
        //     paymentMethodHeader = 'QR Code';
        //     break;
        //   default:
        //     paymentMethodHeader = method;
        // }
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
          colSpan: 3,
          style: 'tableHeader',
          alignment: 'center',
        },
        {},
        {},
        {
          text: 'ราคามวย',
          colSpan: 3,
          style: 'tableHeader',
          alignment: 'center',
        },
        {},
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
        '', // ชื่อเอเย่นต์
        'RS', // จำนวนแขก RS
        'STD', // จำนวนแขก STD
        'CH', // จำนวนแขก Child
        'RS', // ราคามวย RS
        'STD', // ราคามวย STD
        'CHI', // ราคามวย CHI
        'เสื้อ', // เสื้อ (normal shirt)
        'เสื้อ F', // เสื้อ F
        '', // เงินทัวร์
        '', // เสื้อ (รวม)
        '', // รวม
        '', // ฟรี
        '', // PaymentMethod
        '', // No.V/C
      ];

      // � เตรียมข้อมูลแถวสำหรับตาราง
      // เรียงลำดับข้อมูลก่อนแปลงเป็นแถว
      const sortedOrders = [...exportData.orders].sort((a, b) => {
        const aReferrerName = a.referrerName || '';
        const bReferrerName = b.referrerName || '';

        // ถ้าทั้งคู่มี referrerName หรือทั้งคู่ไม่มี ให้เปรียบเทียบกัน
        if (
          (aReferrerName && bReferrerName) ||
          (!aReferrerName && !bReferrerName)
        ) {
          if (aReferrerName && bReferrerName) {
            // เรียงตาม referrerName A-Z
            const nameCompare = aReferrerName.localeCompare(
              bReferrerName,
              'th',
            );
            if (nameCompare !== 0) return nameCompare;
          }
          // ถ้า referrerName เหมือนกันหรือทั้งคู่ไม่มี ให้เรียงตาม createdAt (ล่าสุดก่อน)
          const aCreatedAt = new Date(a.createdAt || 0).getTime();
          const bCreatedAt = new Date(b.createdAt || 0).getTime();
          return bCreatedAt - aCreatedAt;
        }

        // ถ้ามีเพียงฝ่ายใดฝ่ายหนึ่งที่มี referrerName ให้ฝ่ายที่มีขึ้นก่อน
        if (aReferrerName && !bReferrerName) return -1;
        if (!aReferrerName && bReferrerName) return 1;

        return 0;
      });

      const tableRows = sortedOrders.map((order, index) => {
        // 📊 คำนวณจำนวนตั๋วแยกตามประเภท
        console.log(order);
        const standingQty = order.standingAdultQty || 0;
        const standingChildQty = order.standingChildQty || 0;
        const ringsideQty =
          order.ticketType === 'RINGSIDE' ? order.quantity || 0 : 0;
        const stadiumQty =
          order.ticketType === 'STADIUM' ? order.quantity || 0 : 0;
        const rsQty = ringsideQty + stadiumQty;
        const stdQty = standingQty;
        const stdchQty = standingChildQty;
        const totalGuests = rsQty + stdQty + stdchQty;

        // 💰 คำนวณราคาตามประเภทตั๋ว
        const rsPrice = 1400;
        const stdPrice = 1200;
        const stdchPrice = 1000; // ราคามวยสำหรับ Child
        const shirtPrice = 300;

        // ราคามวยแยกตามประเภท
        const rsBoxingPrice = rsQty * rsPrice;
        const stdBoxingPrice = stdQty * stdPrice;
        const stdchBoxingPrice = stdchQty * stdchPrice;
        const totalBoxingPrice =
          rsBoxingPrice + stdBoxingPrice + stdchBoxingPrice;

        // ค่าเสื้อรวม
        const ShirtPrice = shirtPrice;
        const totalShirtPrice = totalGuests * shirtPrice;

        // เงินทัวร์ = ราคามวย - ค่าเสื้อ
        const tourMoney = totalBoxingPrice - totalShirtPrice;

        // รวม = เงินทัวร์ + เสื้อ
        const totalAmount = tourMoney + totalShirtPrice;

        // 💰 คำนวณ paymentAmount ตามเงื่อนไขใหม่
        const grossPaymentAmount = order.paymentAmount || 0;
        let paymentAmount = grossPaymentAmount;

        // ถ้า paymentAmount เท่ากับ totalAmount หรือ paymentAmount เป็น 0 ไม่ต้องทำอะไร
        if (
          grossPaymentAmount !== 0 &&
          grossPaymentAmount !== totalAmount &&
          grossPaymentAmount > totalAmount
        ) {
          // ถ้า paymentAmount มากกว่า totalAmount ให้ลบค่าเสื้อ
          if (order.ticketType === 'STANDING') {
            // ตั๋วยืน: ลบ 400 ต่อตั๋ว
            const standingDeduction = (stdQty + stdchQty) * 400;
            paymentAmount = grossPaymentAmount - standingDeduction;
          } else {
            // ตั๋วนั่ง (RINGSIDE/STADIUM): ลบ 300 ต่อตั๋ว
            const sittingDeduction = rsQty * 300;
            paymentAmount = grossPaymentAmount - sittingDeduction;
          }
        }

        // Logic: ช่องที่เป็น 0 ไม่ต้องโชว์ 0 ให้เป็นว่าง
        function showValue(val: number | string) {
          if (typeof val === 'string') val = Number(val.replace(/,/g, ''));
          return val === 0 ? '' : val.toLocaleString();
        }

        // Logic: ชื่อเอเย่นต์ ถ้าไม่มีให้ว่าง, ถ้าซ้ำกับออเดอร์ก่อนหน้าให้ว่าง
        let refName = order.referrerName || '';
        if (index > 0 && sortedOrders[index - 1]?.referrerName === refName) {
          refName = '';
        }

        return [
          (index + 1).toString(), // NO.
          refName, // ชื่อเอเย่นต์
          rsQty === 0 ? '' : rsQty.toString(), // จำนวนแขก RS
          stdQty === 0 ? '' : stdQty.toString(), // จำนวนแขก STD
          stdchQty === 0 ? '' : stdchQty.toString(), // จำนวนแขก Child
          showValue(rsPrice), // ราคามวย RS
          showValue(stdPrice), // ราคามวย STD
          showValue(stdchPrice), // ราคามวย Child
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
          paymentAmount === 0
            ? ''
            : paymentAmount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              }), // PaymentMethod column
          order.voucherNumber, // No./C (ชื่อลูกค้า)
        ];
      });

      // � คำนวณสรุปสำหรับแถวท้าย
      let totalRS = 0;
      let totalSTD = 0;
      let totalCH = 0; // จำนวนแขก Child
      // let totalRSBoxingPrice = 0; // ราคามวย RS แยก
      // let totalSTDBoxingPrice = 0; // ราคามวย STD แยก
      let totalShirtPrice = 0;
      let totalTourMoney = 0;
      let grandTotal = 0;
      let grandTotalPayment = 0; // รวม
      // let shirtPriceTotals = 0;
      // let totalCHBoxingPrice = 0; // ราคามวย Child แยก

      // วนลูปคำนวณผลรวมจาก sortedOrders
      sortedOrders.forEach((order) => {
        const standingQty = order.standingAdultQty || 0;
        const standingChildQty = order.standingChildQty || 0;
        const ringsideQty =
          order.ticketType === 'RINGSIDE' ? order.quantity || 0 : 0;
        const stadiumQty =
          order.ticketType === 'STADIUM' ? order.quantity || 0 : 0;
        const rsQty = ringsideQty + stadiumQty;
        const stdQty = standingQty;
        const stdchQty = standingChildQty;
        const guests = rsQty + stdQty + stdchQty;

        const rsPrice = 1400;
        const stdPrice = 1200;
        const stdchPrice = 1000;
        const shirtPrice = 300;

        const rsBoxingPrice = rsQty * rsPrice; // ราคามวย RS
        const stdBoxingPrice = stdQty * stdPrice; // ราคามวย STD
        const stdchBoxingPrice = stdchQty * stdchPrice; // ราคามวย Child
        const totalBoxingPrice =
          rsBoxingPrice + stdBoxingPrice + stdchBoxingPrice;
        const shirtPriceTotal = guests * shirtPrice;
        const tourMoney = totalBoxingPrice - shirtPriceTotal;
        const total = tourMoney + shirtPriceTotal;

        totalRS += rsQty;
        totalSTD += stdQty;
        totalCH += stdchQty;
        // totalRSBoxingPrice += rsBoxingPrice;
        // totalSTDBoxingPrice += stdBoxingPrice;
        // totalCHBoxingPrice += stdchBoxingPrice;
        totalShirtPrice += shirtPriceTotal;
        // shirtPriceTotals += shirtPriceTotal;
        totalTourMoney += tourMoney;
        grandTotal += total;

        // คำนวณ grandTotalPayment ตามเงื่อนไขใหม่ (ใช้โลจิกเดียวกับการแสดงในแต่ละแถว)
        const grossOrderPayment = Number(order.paymentAmount || 0); // แปลงเป็นตัวเลข
        let orderPaymentAmount = grossOrderPayment;

        // ใช้โลจิกเดียวกันกับในแต่ละแถวของตาราง
        if (
          grossOrderPayment !== 0 &&
          grossOrderPayment !== total &&
          grossOrderPayment > total
        ) {
          // ถ้า paymentAmount มากกว่า totalAmount ให้ลบค่าเสื้อ
          if (order.ticketType === 'STANDING') {
            // ตั๋วยืน: ลบ 400 ต่อตั๋ว
            const standingDeduction = (stdQty + stdchQty) * 400;
            orderPaymentAmount = grossOrderPayment - standingDeduction;
          } else {
            // ตั๋วนั่ง (RINGSIDE/STADIUM): ลบ 300 ต่อตั๋ว
            const sittingDeduction = rsQty * 300;
            orderPaymentAmount = grossOrderPayment - sittingDeduction;
          }
        }

        // แปลงเป็นตัวเลขและบวกเฉพาะค่าที่ไม่เป็น 0 (ตรงกับเงื่อนไขการแสดงผล)
        const numericPaymentAmount = Number(orderPaymentAmount);
        if (numericPaymentAmount !== 0) {
          grandTotalPayment = Number(grandTotalPayment) + numericPaymentAmount;
        }

        // Debug log สำหรับตรวจสอบการคำนวณ
        console.log(`Order ${order.orderNumber || 'unknown'}:`, {
          ticketType: order.ticketType,
          rsQty,
          stdQty: stdQty + stdchQty,
          grossPayment: grossOrderPayment,
          total,
          calculatedPayment: numericPaymentAmount,
          runningTotal: grandTotalPayment,
        });
      });

      // เพิ่มแถวสรุปท้ายตาราง (ปรับให้ตรงกับโครงสร้างใหม่)
      const summaryRow = [
        'รวม', // NO.
        'สรุปทั้งหมด', // รายละเอียด
        totalRS.toString(), // จำนวนแขก RS
        totalSTD.toString(), // จำนวนแขก STD
        totalCH.toString(), // จำนวนแขก Child
        0, // ราคามวย RS
        0, // ราคามวย STD
        0, // ราคามวย Child
        0, // เสื้อ 300
        '', // เสื้อ F
        totalTourMoney.toLocaleString('en-US', { minimumFractionDigits: 2 }), // เงินทัวร์
        totalShirtPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }), // จำนวนรวมเสื้อ
        grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), // รวม
        '', // ฟรี
        grandTotalPayment.toLocaleString('en-US', { minimumFractionDigits: 2 }), // PaymentMethod column
        ``, // No./C
      ];

      // เพิ่ม summaryRow เข้าไปใน tableRows
      tableRows.push(summaryRow);

      // Debug log สำหรับตรวจสอบผลรวมสุดท้าย
      console.log('=== PDF Summary Calculation ===');
      console.log('Total RS:', totalRS);
      console.log('Total STD:', totalSTD);
      console.log('Total CH:', totalCH);
      console.log('Total Tour Money:', totalTourMoney);
      console.log('Total Shirt Price:', totalShirtPrice);
      console.log('Grand Total:', grandTotal);
      console.log('Grand Total Payment:', grandTotalPayment);
      console.log('================================');

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
        pageMargins: [10, 60, 20, 60],
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
              widths: [
                20, 150, 20, 20, 20, 30, 30, 30, 25, 25, 60, 60, 60, 15, 60, 60,
              ], // ความกว้างคอลัมน์ใหม่
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
                    alignment: [2, 3, 8, 9, 10, 11, 12, 14].includes(index)
                      ? 'right' // RS, STD, เงินทัวร์, เสื้อ, รวม, paymentMethodHeader
                      : index === 0 || index === 1 // NO. และ ชื่อเอเย่นต์
                        ? 'left' // รายละเอียดและชื่อลูกค้าชิดซ้าย
                        : index === 13 || index === 15 // No./C และ PaymentMethod
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

      return pdfBuffer;
    } catch (error) {
      this.logger.error('❌ Failed to generate PDF', error.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการสร้าง PDF: ${error.message}`,
      );
    }
  }

  async generateOrdersExcel(exportData: {
    orders: any[];
    summary: any;
    metadata: any;
  }): Promise<Buffer> {
    try {
      console.log('🔧 Starting Excel generation with ExcelJS...');
      console.log('📊 Orders to process:', exportData.orders.length);

      // ใช้ dynamic import สำหรับ exceljs แบบ optimized
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();

      // ตั้งค่า workbook properties สำหรับการรองรับภาษาไทย
      workbook.creator = 'Boxing Stadium System';
      workbook.lastModifiedBy = 'Boxing Stadium System';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.company = 'Boxing Stadium Patong Beach';
      workbook.title = 'Orders Export Report';
      workbook.subject = 'Order Management System Export';

      console.log('✅ ExcelJS workbook created with metadata');

      // สร้าง worksheet พร้อม configuration ที่เหมาะสมสำหรับภาษาไทย
      const worksheet = workbook.addWorksheet('Orders Export', {
        properties: {
          tabColor: { argb: 'FF0000FF' },
          defaultRowHeight: 20,
        },
        views: [
          {
            state: 'frozen',
            xSplit: 2,
            ySplit: 1,
            activeCell: 'A1',
            showGridLines: true,
          },
        ],
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'landscape',
          fitToPage: true,
          margins: {
            left: 0.7,
            right: 0.7,
            top: 0.75,
            bottom: 0.75,
            header: 0.3,
            footer: 0.3,
          },
        },
      });

      // สร้าง headers ที่รองรับภาษาไทยอย่างเต็มรูปแบบ
      const headers = [
        'Order ID',
        'NO.',
        'ชื่อเอเย่นต์',
        'RS',
        'STD',
        'CH',
        'ราคามวย RS',
        'ราคามวย STD',
        'ราคามวย CHI',
        'เสื้อ',
        'เสื้อ F',
        'เงินทัวร์',
        'เสื้อรวม',
        'รวม',
        'ฟรี',
        'ยอดเงิน',
        'No. V/C',
      ];

      // เพิ่ม header row พร้อมการจัดรูปแบบ professional
      const headerRow = worksheet.addRow(headers);

      // จัดรูปแบบ header ให้ professional
      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          name: 'Tahoma',
          size: 11,
          color: { argb: 'FFFFFFFF' }, // สีขาว
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF366092' }, // สีน้ำเงินเข้ม
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
      });

      console.log('📊 Adding data rows with Thai language support...');

      // เรียงลำดับข้อมูลก่อนแปลงเป็นแถว
      const sortedOrders = [...exportData.orders].sort((a, b) => {
        const aReferrerName = a.referrerName || '';
        const bReferrerName = b.referrerName || '';

        // ถ้าทั้งคู่มี referrerName หรือทั้งคู่ไม่มี ให้เปรียบเทียบกัน
        if (
          (aReferrerName && bReferrerName) ||
          (!aReferrerName && !bReferrerName)
        ) {
          if (aReferrerName && bReferrerName) {
            // เรียงตาม referrerName A-Z
            const nameCompare = aReferrerName.localeCompare(
              bReferrerName,
              'th',
            );
            if (nameCompare !== 0) return nameCompare;
          }
          // ถ้า referrerName เหมือนกันหรือทั้งคู่ไม่มี ให้เรียงตาม createdAt (ล่าสุดก่อน)
          const aCreatedAt = new Date(a.createdAt || 0).getTime();
          const bCreatedAt = new Date(b.createdAt || 0).getTime();
          return bCreatedAt - aCreatedAt;
        }

        // ถ้ามีเพียงฝ่ายใดฝ่ายหนึ่งที่มี referrerName ให้ฝ่ายที่มีขึ้นก่อน
        if (aReferrerName && !bReferrerName) return -1;
        if (!aReferrerName && bReferrerName) return 1;

        return 0;
      });

      // เพิ่มข้อมูลพร้อมการจัดรูปแบบที่เหมาะสม
      sortedOrders.forEach((order, index) => {
        const standingQty = order.standingAdultQty || 0;
        const standingChildQty = order.standingChildQty || 0;
        const ringsideQty =
          order.ticketType === 'RINGSIDE' ? order.quantity || 0 : 0;
        const stadiumQty =
          order.ticketType === 'STADIUM' ? order.quantity || 0 : 0;
        const rsQty = ringsideQty + stadiumQty;
        const stdQty = standingQty;
        const stdchQty = standingChildQty;
        const totalGuests = rsQty + stdQty + stdchQty;

        // 💰 คำนวณราคาตามประเภทตั๋ว (ตรงกับ PDF)
        const rsPrice = 1400;
        const stdPrice = 1200;
        const stdchPrice = 1000; // ราคามวยสำหรับ Child
        const shirtPrice = 300;

        // ราคามวยแยกตามประเภท
        const rsBoxingPrice = rsQty * rsPrice;
        const stdBoxingPrice = stdQty * stdPrice;
        const stdchBoxingPrice = stdchQty * stdchPrice;
        const totalBoxingPrice =
          rsBoxingPrice + stdBoxingPrice + stdchBoxingPrice;

        // ค่าเสื้อรวม
        const totalShirtPrice = totalGuests * shirtPrice;

        // เงินทัวร์ = ราคามวย - ค่าเสื้อ
        const tourMoney = totalBoxingPrice - totalShirtPrice;

        // รวม = เงินทัวร์ + เสื้อ
        const totalAmount = tourMoney + totalShirtPrice;

        // 💰 คำนวณ paymentAmount ตามเงื่อนไขใหม่ (Excel version)
        const grossPaymentAmount = order.paymentAmount || 0;
        let paymentAmount = grossPaymentAmount;

        // ถ้า paymentAmount เท่ากับ totalAmount หรือ paymentAmount เป็น 0 ไม่ต้องทำอะไร
        if (
          grossPaymentAmount !== 0 &&
          grossPaymentAmount !== totalAmount &&
          grossPaymentAmount > totalAmount
        ) {
          // ถ้า paymentAmount มากกว่า totalAmount ให้ลบค่าเสื้อ
          if (order.ticketType === 'STANDING') {
            // ตั๋วยืน: ลบ 400 ต่อตั๋ว
            const standingDeduction = (stdQty + stdchQty) * 400;
            paymentAmount = grossPaymentAmount - standingDeduction;
          } else {
            // ตั๋วนั่ง (RINGSIDE/STADIUM): ลบ 300 ต่อตั๋ว
            const sittingDeduction = rsQty * 300;
            paymentAmount = grossPaymentAmount - sittingDeduction;
          }
        }

        // Logic: ชื่อเอเย่นต์ ถ้าไม่มีให้ว่าง, ถ้าซ้ำกับออเดอร์ก่อนหน้าให้ว่าง
        let refName = order.referrerName || '';
        if (index > 0 && sortedOrders[index - 1]?.referrerName === refName) {
          refName = '';
        }

        const rowData = [
          order.id || '',
          index + 1,
          refName, // ใช้ refName แทน order.referrer?.name
          rsQty === 0 ? '' : rsQty,
          stdQty === 0 ? '' : stdQty,
          stdchQty === 0 ? '' : stdchQty,
          rsPrice,
          stdPrice,
          stdchPrice,
          shirtPrice, // เสื้อ 300
          '', // เสื้อ F (ว่าง)
          tourMoney === 0 ? '' : tourMoney,
          totalShirtPrice === 0 ? '' : totalShirtPrice,
          totalAmount === 0 ? '' : totalAmount,
          '', // ฟรี (ว่าง)
          paymentAmount === 0 ? '' : paymentAmount,
          order.voucherNumber || '',
        ];

        const dataRow = worksheet.addRow(rowData);

        // จัดรูปแบบ data rows
        dataRow.eachCell((cell, colNumber) => {
          cell.font = {
            name: 'Tahoma',
            size: 10,
          };

          // สีพื้นหลังสลับแถว
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' }, // สีเทาอ่อน
            };
          }

          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          };

          // จัดตำแหน่งข้อมูล
          if (colNumber === 1) {
            // Order ID
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else if (colNumber === 3) {
            // ชื่อเอเย่นต์
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else if (colNumber >= 4 && colNumber <= 17) {
            // ตัวเลข
            cell.alignment = { horizontal: 'right', vertical: 'middle' };

            // จัดรูปแบบตัวเลขเงิน
            if ([7, 8, 9, 10, 12, 13, 14, 16].includes(colNumber)) {
              if (typeof cell.value === 'number' && cell.value > 0) {
                cell.numFmt = '#,##0.00';
              }
            }
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      // ปรับขนาดคอลัมน์อัตโนมัติ
      const columnWidths = [
        { width: 40 }, // Order ID
        { width: 8 }, // NO.
        { width: 25 }, // ชื่อเอเย่นต์
        { width: 8 }, // RS
        { width: 8 }, // STD
        { width: 8 }, // CH
        { width: 15 }, // ราคามวย RS
        { width: 15 }, // ราคามวย STD
        { width: 15 }, // ราคามวย CHI
        { width: 10 }, // เสื้อ
        { width: 10 }, // เสื้อ F
        { width: 15 }, // เงินทัวร์
        { width: 15 }, // เสื้อรวม
        { width: 15 }, // รวม
        { width: 8 }, // ฟรี
        { width: 15 }, // ยอดเงิน
        { width: 20 }, // No. V/C
      ];

      worksheet.columns = columnWidths;

      // เพิ่ม auto-filter สำหรับ header
      worksheet.autoFilter = {
        from: 'A1',
        to: String.fromCharCode(65 + headers.length - 1) + '1',
      };

      console.log('🔧 Generating Excel buffer with optimal settings...');

      // สร้าง buffer ด้วยการตั้งค่าที่เหมาะสมสำหรับ performance
      const buffer = await workbook.xlsx.writeBuffer({
        useSharedStrings: true, // ลดขนาดไฟล์และปรับปรุงประสิทธิภาพ
        useStyles: true, // เปิดใช้งาน styles
      });

      console.log(
        '✅ Excel buffer generated, size:',
        buffer.byteLength,
        'bytes',
      );

      // ตรวจสอบความถูกต้องของ Excel file
      const bufferInstance = Buffer.from(buffer);

      // ตรวจสอบ Excel magic bytes (ZIP signature)
      const magicBytes = bufferInstance.slice(0, 4);
      const expectedMagicBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      const isValidExcel = magicBytes.equals(expectedMagicBytes);

      console.log('📋 File validation:');
      console.log('  - Magic bytes:', magicBytes.toString('hex'));
      console.log('  - Expected:', expectedMagicBytes.toString('hex'));
      console.log('  - Is valid Excel:', isValidExcel);
      console.log('  - Buffer size:', bufferInstance.length, 'bytes');

      if (!isValidExcel) {
        console.error('❌ Generated buffer is not a valid Excel file');
        throw new Error('Failed to generate valid Excel file - invalid format');
      }

      console.log('✅ Excel file validation passed - ready for download');
      return bufferInstance;
    } catch (error) {
      this.logger.error('❌ Excel generation failed:', {
        message: error.message,
        stack: error.stack,
        orderCount: exportData?.orders?.length || 0,
      });

      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการสร้าง Excel: ${error.message}`,
      );
    }
  }
  async generateOrdersCSV(exportData: {
    orders: any[];
    summary: any;
    metadata: any;
  }): Promise<string> {
    try {
      const headers = [
        'Order ID', // เพิ่ม Order ID เป็นคอลัมน์แรก
        'NO.',
        'ชื่อเอเย่นต์',
        'RS',
        'STD',
        'CH',
        'ราคามวย RS',
        'ราคามวย STD',
        'ราคามวย CHI',
        'เสื้อ',
        'เสื้อ F',
        'เงินทัวร์',
        'เสื้อรวม',
        'รวม',
        'ฟรี',
        'ยอดเงิน',
        'No. V/C',
      ];

      let csvContent = headers.join(',') + '\n';

      // เรียงลำดับข้อมูลก่อนแปลงเป็นแถว
      const sortedOrders = [...exportData.orders].sort((a, b) => {
        const aReferrerName = a.referrerName || '';
        const bReferrerName = b.referrerName || '';

        // ถ้าทั้งคู่มี referrerName หรือทั้งคู่ไม่มี ให้เปรียบเทียบกัน
        if (
          (aReferrerName && bReferrerName) ||
          (!aReferrerName && !bReferrerName)
        ) {
          if (aReferrerName && bReferrerName) {
            // เรียงตาม referrerName A-Z
            const nameCompare = aReferrerName.localeCompare(
              bReferrerName,
              'th',
            );
            if (nameCompare !== 0) return nameCompare;
          }
          // ถ้า referrerName เหมือนกันหรือทั้งคู่ไม่มี ให้เรียงตาม createdAt (ล่าสุดก่อน)
          const aCreatedAt = new Date(a.createdAt || 0).getTime();
          const bCreatedAt = new Date(b.createdAt || 0).getTime();
          return bCreatedAt - aCreatedAt;
        }

        // ถ้ามีเพียงฝ่ายใดฝ่ายหนึ่งที่มี referrerName ให้ฝ่ายที่มีขึ้นก่อน
        if (aReferrerName && !bReferrerName) return -1;
        if (!aReferrerName && bReferrerName) return 1;

        return 0;
      });

      sortedOrders.forEach((order, index) => {
        const standingQty = order.standingAdultQty || 0;
        const standingChildQty = order.standingChildQty || 0;
        const ringsideQty =
          order.ticketType === 'RINGSIDE' ? order.quantity || 0 : 0;
        const stadiumQty =
          order.ticketType === 'STADIUM' ? order.quantity || 0 : 0;
        const rsQty = ringsideQty + stadiumQty;
        const stdQty = standingQty;
        const stdchQty = standingChildQty;
        const totalGuests = rsQty + stdQty + stdchQty;

        // 💰 คำนวณราคาตามประเภทตั๋ว (ตรงกับ PDF)
        const rsPrice = 1400;
        const stdPrice = 1200;
        const stdchPrice = 1000; // ราคามวยสำหรับ Child
        const ShirtPrice = 300;

        // ราคามวยแยกตามประเภท
        const rsBoxingPrice = rsQty * rsPrice;
        const stdBoxingPrice = stdQty * stdPrice;
        const stdchBoxingPrice = stdchQty * stdchPrice;
        const totalBoxingPrice =
          rsBoxingPrice + stdBoxingPrice + stdchBoxingPrice;

        // ค่าเสื้อรวม
        const totalShirtPrice = totalGuests * ShirtPrice;

        // เงินทัวร์ = ราคามวย - ค่าเสื้อ
        const tourMoney = totalBoxingPrice - totalShirtPrice;

        // รวม = เงินทัวร์ + เสื้อ
        const totalAmount = tourMoney + totalShirtPrice;

        // 💰 คำนวณ paymentAmount ตามเงื่อนไขใหม่ (CSV version)
        const grossPaymentAmount = order.paymentAmount || 0;
        let paymentAmount = grossPaymentAmount;

        // ถ้า paymentAmount เท่ากับ totalAmount หรือ paymentAmount เป็น 0 ไม่ต้องทำอะไร
        if (
          grossPaymentAmount !== 0 &&
          grossPaymentAmount !== totalAmount &&
          grossPaymentAmount > totalAmount
        ) {
          // ถ้า paymentAmount มากกว่า totalAmount ให้ลบค่าเสื้อ
          if (order.ticketType === 'STANDING') {
            // ตั๋วยืน: ลบ 400 ต่อตั๋ว
            const standingDeduction = (stdQty + stdchQty) * 400;
            paymentAmount = grossPaymentAmount - standingDeduction;
          } else {
            // ตั๋วนั่ง (RINGSIDE/STADIUM): ลบ 300 ต่อตั๋ว
            const sittingDeduction = rsQty * 300;
            paymentAmount = grossPaymentAmount - sittingDeduction;
          }
        }

        // Logic: ชื่อเอเย่นต์ ถ้าไม่มีให้ว่าง, ถ้าซ้ำกับออเดอร์ก่อนหน้าให้ว่าง
        let refName = order.referrerName || '';
        if (index > 0 && sortedOrders[index - 1]?.referrerName === refName) {
          refName = '';
        }

        const row = [
          order.id || '', // Order ID เป็นคอลัมน์แรก
          index + 1,
          `"${refName}"`, // ใช้ refName แทน order.referrer?.name
          rsQty === 0 ? '' : rsQty,
          stdQty === 0 ? '' : stdQty,
          stdchQty === 0 ? '' : stdchQty,
          rsPrice,
          stdPrice,
          stdchPrice,
          ShirtPrice, // เสื้อ 300
          '', // เสื้อ F (ว่าง)
          tourMoney === 0 ? '' : tourMoney,
          totalShirtPrice === 0 ? '' : totalShirtPrice,
          totalAmount === 0 ? '' : totalAmount,
          '', // ฟรี (ว่าง)
          paymentAmount === 0 ? '' : paymentAmount,
          `"${order.voucherNumber || ''}"`,
        ];
        csvContent += row.join(',') + '\n';
      });

      return csvContent;
    } catch (error) {
      this.logger.error('❌ Failed to generate CSV', error.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการสร้าง CSV: ${error.message}`,
      );
    }
  }
  async exportOrders(
    orderIds: string[],
    format: 'csv' | 'excel' = 'csv',
    includePayments: boolean = true,
  ): Promise<{ data: string | Buffer; filename: string; mimeType: string }> {
    try {
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
      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการ export ออเดอร์: ${error.message}`,
      );
    }
  }
  async importAndUpdateOrders(
    importData: any[],
    userId: string,
  ): Promise<ImportUpdateResult> {
    try {
      const result = await OrderExportImportHelper.importAndUpdateOrders(
        importData,
        this.orderRepo,
        this.paymentRepo,
        this.seatBookingRepo,
        userId,
      );
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to import orders', error.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการ import ออเดอร์: ${error.message}`,
      );
    }
  }
  async importOrdersFromFileBuffer(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    userId: string,
  ): Promise<ImportUpdateResult> {
    try {
      const result = await OrderExportImportHelper.importFromFileBuffer(
        buffer,
        mimeType,
        filename,
        this.orderRepo,
        this.paymentRepo,
        this.seatBookingRepo,
        userId,
      );
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to import from file', error.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการ import ไฟล์: ${error.message}`,
      );
    }
  }

  // =============================================
  // 🚀 BATCH PROCESSING METHODS
  // =============================================

  /**
   * 📤 Batch Export with Progress Tracking
   */
  async batchExportOrdersWithProgress(
    filters: any,
    taskId: string,
    progressService: any,
    batchService: any,
  ): Promise<any[]> {
    try {
      // Update progress - starting
      progressService.updateExportProgress(taskId, {
        status: 'PROCESSING',
        currentPhase: 'FETCHING',
        message: 'กำลังดึงข้อมูลออเดอร์...',
      });

      // Fetch all orders with optimized query
      const orders = await this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.payment', 'payment')
        .leftJoinAndSelect('order.referrer', 'referrer')
        .leftJoinAndSelect('order.seatBookings', 'seatBookings')
        .leftJoinAndSelect('seatBookings.seat', 'seat')
        .leftJoinAndSelect('seat.zone', 'zone')
        .select([
          'order.id',
          'order.orderNumber',
          'order.customerName',
          'order.customerPhone',
          'order.customerEmail',
          'order.ticketType',
          'order.quantity',
          'order.totalAmount',
          'order.actualPaidAmount',
          'order.paymentAmountVerified',
          'order.status',
          'order.paymentMethod',
          'order.showDate',
          'order.createdAt',
          'order.updatedAt',
          'order.standingAdultQty',
          'order.standingChildQty',
          'order.standingCommission',
          'order.referrerCommission',
          'payment.id',
          'payment.status',
          'referrer.id',
          'referrer.code',
          'referrer.name',
        ])
        .orderBy('order.createdAt', 'DESC')
        .getMany();

      progressService.updateExportProgress(taskId, {
        currentPhase: 'PROCESSING',
        ordersTotal: orders.length,
        message: `พบ ${orders.length} ออเดอร์ กำลังประมวลผล...`,
      });

      // Use batch processing service
      const exportData = await batchService.batchExportOrders(orders, taskId);

      return exportData;
    } catch (error) {
      progressService.failTask(taskId, error.message);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการ export: ${error.message}`,
      );
    }
  }

  /**
   * 📥 Batch Import with Progress Tracking
   */
  async batchImportOrdersWithProgress(
    importData: any[],
    userId: string,
    taskId: string,
    progressService: any,
    batchService: any,
  ): Promise<ImportUpdateResult> {
    try {
      progressService.updateImportProgress(taskId, {
        status: 'PROCESSING',
        ordersTotal: importData.length,
        message: 'เริ่มนำเข้าข้อมูลออเดอร์...',
      });

      // Use batch processing service
      const result = await batchService.batchImportOrders(
        importData,
        this.orderRepo,
        this.paymentRepo,
        this.seatBookingRepo,
        userId,
        taskId,
      );

      progressService.completeTask(
        taskId,
        `นำเข้าข้อมูลเสร็จสิ้น: ${result.ordersUpdated} ออเดอร์อัปเดต`,
      );

      return result;
    } catch (error) {
      progressService.failTask(taskId, error.message);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการ import: ${error.message}`,
      );
    }
  }

  /**
   * 📊 Optimized Export Data Query (for large datasets)
   */
  async getOptimizedExportData(filters: any = {}): Promise<any[]> {
    const queryBuilder = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.payment', 'payment')
      .leftJoinAndSelect('order.referrer', 'referrer')
      .select([
        'order.id',
        'order.orderNumber',
        'order.customerName',
        'order.customerPhone',
        'order.customerEmail',
        'order.ticketType',
        'order.quantity',
        'order.totalAmount',
        'order.actualPaidAmount',
        'order.paymentAmountVerified',
        'order.status',
        'order.paymentMethod',
        'order.showDate',
        'order.createdAt',
        'order.updatedAt',
        'order.standingAdultQty',
        'order.standingChildQty',
        'order.standingCommission',
        'order.referrerCommission',
        'payment.status',
        'referrer.code',
        'referrer.name',
      ]);

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('order.status = :status', {
        status: filters.status,
      });
    }

    if (filters.showDate) {
      queryBuilder.andWhere('order.showDate = :showDate', {
        showDate: filters.showDate,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(order.orderNumber ILIKE :search OR order.customerName ILIKE :search OR order.customerPhone ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Order by creation date for consistent export
    queryBuilder.orderBy('order.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }
}
