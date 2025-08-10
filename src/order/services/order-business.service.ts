// ========================================
// 🏭 ORDER BUSINESS SERVICE
// ========================================
// Centralized order business logic and data processing

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../../user/user.entity';
import { Referrer } from '../../referrer/referrer.entity';
import { Order } from '../order.entity';
import { CreateOrderRequest } from '../order.service';
import {
  OrderStatus,
  OrderPurchaseType,
  PaymentMethod,
  TicketType,
  UserRole,
} from '../../common/enums';
import {
  ThailandTimeHelper,
  BusinessLogicHelper,
  ReferenceGenerator,
} from '../../common/utils';
import {
  TICKET_PRICES,
  COMMISSION_RATES,
  TIME_LIMITS,
} from '../../common/constants';
import { OrderData, OrderDataMapper } from '../mappers/order-data.mapper';

export interface OrderPricingResult {
  totalAmount: number;
  commission: number;
}

export interface OrderCreationData {
  orderData: any;
  pricing: OrderPricingResult;
}

@Injectable()
export class OrderBusinessService {
  constructor(private configService: ConfigService) {}

  // ========================================
  // 🏗️ ORDER CREATION LOGIC
  // ========================================

  /**
   * สร้างข้อมูล order พื้นฐาน
   */
  createBaseOrderData(
    request: CreateOrderRequest,
    user: User,
    referrer: Referrer | null,
  ): OrderCreationData {
    // Calculate pricing
    const pricing = this.calculateOrderPricing(request);

    // Generate order number
    const orderNumber = ReferenceGenerator.generateOrderNumber();

    // Prepare base order data
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
      source: request.source || 'DIRECT',
      purchaseType: request.purchaseType || OrderPurchaseType.ONSITE,
      attendanceStatus:
        request.attendanceStatus ||
        ((request.purchaseType || OrderPurchaseType.ONSITE) ===
        OrderPurchaseType.ONSITE
          ? 'CHECKED_IN'
          : 'PENDING'),
      expiresAt: BusinessLogicHelper.calculateExpiryTime(
        ThailandTimeHelper.now(),
        this.configService.get(
          'RESERVATION_TIMEOUT_MINUTES',
          TIME_LIMITS.RESERVATION_MINUTES,
        ),
      ),
      createdBy: user.id,
    };

    // Handle BOOKED order expiry time
    if (request.status === OrderStatus.BOOKED) {
      const showDate = ThailandTimeHelper.toThailandTime(request.showDate);
      const expiryDate =
        ThailandTimeHelper.format(showDate, 'YYYY-MM-DD') + ' 21:00:00';
      orderData.expiresAt = ThailandTimeHelper.toThailandTime(expiryDate);
    }

    return { orderData, pricing };
  }

  /**
   * เพิ่มข้อมูลสำหรับตั๋วแบบยืน
   */
  addStandingTicketData(orderData: any, request: CreateOrderRequest): void {
    if (request.ticketType !== TicketType.STANDING) {
      return;
    }

    const adultQty = request.standingAdultQty || 0;
    const childQty = request.standingChildQty || 0;

    // Validate constants
    this.validateStandingTicketConstants();

    const adultTotal = adultQty * TICKET_PRICES.STANDING_ADULT;
    const childTotal = childQty * TICKET_PRICES.STANDING_CHILD;
    const standingTotal = adultTotal + childTotal;

    // Validate calculations
    if (isNaN(adultTotal) || isNaN(childTotal) || isNaN(standingTotal)) {
      throw new BadRequestException(
        'ไม่สามารถคำนวณบัตรยืนได้ กรุณาตรวจสอบจำนวนบัตรและราคาอีกครั้ง',
      );
    }

    // Update order data for standing tickets
    orderData.standingAdultQty = adultQty;
    orderData.standingChildQty = childQty;
    orderData.standingTotal = standingTotal;
    orderData.standingCommission =
      adultQty * COMMISSION_RATES.STANDING_ADULT +
      childQty * COMMISSION_RATES.STANDING_CHILD;
    orderData.quantity = adultQty + childQty;
    orderData.total = standingTotal;
    orderData.totalAmount = standingTotal;
  }

  /**
   * กำหนดสถานะ order สำหรับตั๋วแบบยืนในวันเดียวกัน
   */
  setStandingOrderStatus(orderData: any, request: CreateOrderRequest): void {
    if (request.ticketType !== TicketType.STANDING || request.status) {
      return;
    }

    if (
      ThailandTimeHelper.isSameDay(request.showDate, ThailandTimeHelper.now())
    ) {
      orderData.status = OrderStatus.CONFIRMED;
    }
  }

  // ========================================
  // 💰 PRICING CALCULATIONS
  // ========================================

  /**
   * คำนวณราคา order
   */
  calculateOrderPricing(request: CreateOrderRequest): OrderPricingResult {
    // For standing tickets, calculate separately
    if (request.ticketType === TicketType.STANDING) {
      const adultQty = request.standingAdultQty || 0;
      const childQty = request.standingChildQty || 0;

      const totalAmount =
        adultQty * TICKET_PRICES.STANDING_ADULT +
        childQty * TICKET_PRICES.STANDING_CHILD;

      const commission =
        adultQty * COMMISSION_RATES.STANDING_ADULT +
        childQty * COMMISSION_RATES.STANDING_CHILD;

      return { totalAmount, commission };
    }

    // For seated tickets
    const quantity = request.quantity || request.seatIds?.length || 0;
    const pricePerSeat = TICKET_PRICES[request.ticketType];

    if (typeof pricePerSeat !== 'number') {
      throw new InternalServerErrorException(
        `Invalid ticket price for type: ${request.ticketType}`,
      );
    }

    const totalAmount = quantity * pricePerSeat;
    const commission = quantity * COMMISSION_RATES.SEAT;

    return { totalAmount, commission };
  }

  /**
   * คำนวณราคาสำหรับการเปลี่ยนที่นั่ง
   */
  calculateSeatPricing(
    ticketType: TicketType,
    seatCount: number,
  ): OrderPricingResult {
    const pricePerSeat = TICKET_PRICES[ticketType];

    if (typeof pricePerSeat !== 'number') {
      throw new InternalServerErrorException(
        `Invalid ticket price for type: ${ticketType}`,
      );
    }

    const totalAmount = seatCount * pricePerSeat;
    const commission = seatCount * COMMISSION_RATES.SEAT;

    return { totalAmount, commission };
  }

  /**
   * คำนวณสรุปออเดอร์ทั้งหมด
   */
  calculateOrdersSummary(orders: OrderData[]): {
    totalOrders: number;
    totalAmount: number;
    totalCommission: number;
    byStatus: Record<string, number>;
    byTicketType: Record<string, number>;
  } {
    const summary = {
      totalOrders: orders.length,
      totalAmount: 0,
      totalCommission: 0,
      byStatus: {} as Record<string, number>,
      byTicketType: {} as Record<string, number>,
    };

    orders.forEach((order) => {
      // Total calculations
      summary.totalAmount += order.totalAmount || 0;
      summary.totalCommission += order.referrerCommission || 0;

      // Group by status
      const status = order.status || 'UNKNOWN';
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

      // Group by ticket type
      const ticketType = order.ticketType || 'UNKNOWN';
      summary.byTicketType[ticketType] =
        (summary.byTicketType[ticketType] || 0) + 1;
    });

    return summary;
  }

  // ========================================
  // 🔒 VALIDATION LOGIC
  // ========================================

  /**
   * ตรวจสอบสิทธิ์การเข้าถึง order
   */
  validateOrderAccess(
    user: User,
    order: Order,
    action: 'VIEW' | 'UPDATE' | 'CANCEL' | 'DELETE' = 'VIEW',
  ): void {
    // Admin สามารถทำทุกอย่างได้
    if (user.role === UserRole.ADMIN) {
      return;
    }

    // Staff สามารถทำได้ทุกอย่างยกเว้น DELETE
    if (user.role === UserRole.STAFF && action !== 'DELETE') {
      return;
    }

    // User สามารถเข้าถึงได้เฉพาะ order ของตนเอง
    if (user.role === UserRole.USER && order.userId === user.id) {
      // User ไม่สามารถลบ order ได้
      if (action === 'DELETE') {
        throw new BadRequestException('คุณไม่มีสิทธิ์ลบออเดอร์');
      }
      return;
    }

    throw new BadRequestException('คุณไม่มีสิทธิ์เข้าถึงออเดอร์นี้');
  }

  /**
   * ตรวจสอบการสร้างตั๋ว
   */
  validateTicketGeneration(user: User, order: Order): void {
    // Check user permissions
    if (user.role === UserRole.USER && order.userId !== user.id) {
      throw new BadRequestException('คุณไม่มีสิทธิ์สร้างตั๋วของออเดอร์นี้');
    }

    // Check order status
    // if (
    //   ![OrderStatus.CONFIRMED, OrderStatus.PAID].includes(
    //     order.status as OrderStatus,
    //   )
    // ) {
    //   throw new BadRequestException(
    //     'ไม่สามารถสร้างตั๋วได้ เนื่องจากออเดอร์ยังไม่ได้รับการยืนยัน',
    //   );
    // }
  }

  // ========================================
  // 📊 DATA TRANSFORMATION
  // ========================================

  /**
   * แปลง Order เป็น OrderData
   */
  transformOrderToData(order: Order): OrderData {
    return OrderDataMapper.mapToOrderData(order);
  }

  /**
   * แปลงหลาย Orders เป็น OrderData array
   */
  transformOrdersToData(orders: Order[]): OrderData[] {
    return OrderDataMapper.mapOrdersToData(orders);
  }

  /**
   * แปลงสำหรับ Export
   */
  transformForExport(order: OrderData): Record<string, any> {
    return OrderDataMapper.mapToExportData(order);
  }

  /**
   * สร้างข้อมูลตั๋ว
   */
  generateTicketData(order: Order) {
    return OrderDataMapper.mapToTicketData(order);
  }

  // ========================================
  // 🛠️ PRIVATE HELPERS
  // ========================================

  /**
   * ตรวจสอบค่าคงที่สำหรับตั๋วแบบยืน
   */
  private validateStandingTicketConstants(): void {
    if (
      typeof TICKET_PRICES.STANDING_ADULT !== 'number' ||
      typeof TICKET_PRICES.STANDING_CHILD !== 'number' ||
      typeof COMMISSION_RATES.STANDING_ADULT !== 'number' ||
      typeof COMMISSION_RATES.STANDING_CHILD !== 'number'
    ) {
      throw new InternalServerErrorException(
        'ข้อมูลราคาบัตรหรือค่าคอมมิชชั่นไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่',
      );
    }
  }
}
