import {
  OrderStatus,
  OrderPurchaseType,
  PaymentMethod,
  TicketType,
} from '../../common/enums';
import { CreateOrderRequest } from '../order.service';
import { User } from '../../user/user.entity';
import { Referrer } from '../../referrer/referrer.entity';
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
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';

export interface OrderDataResult {
  orderData: any;
  pricing: {
    totalAmount: number;
    commission: number;
  };
}

export class OrderDataHelper {
  /**
   * สร้างข้อมูล order พื้นฐาน
   */
  static createBaseOrderData(
    request: CreateOrderRequest,
    user: User,
    referrer: Referrer | null,
    configService: ConfigService,
  ): OrderDataResult {
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
        configService.get(
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
  static addStandingTicketData(
    orderData: any,
    request: CreateOrderRequest,
  ): void {
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
  static setStandingOrderStatus(
    orderData: any,
    request: CreateOrderRequest,
  ): void {
    if (request.ticketType !== TicketType.STANDING || request.status) {
      return;
    }

    if (
      ThailandTimeHelper.isSameDay(request.showDate, ThailandTimeHelper.now())
    ) {
      orderData.status = OrderStatus.CONFIRMED;
    }
  }

  /**
   * คำนวณราคา order
   */
  private static calculateOrderPricing(request: CreateOrderRequest): {
    totalAmount: number;
    commission: number;
  } {
    // For standing tickets, calculate separately in addStandingTicketData
    if (request.ticketType === TicketType.STANDING) {
      return { totalAmount: 0, commission: 0 };
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
   * ตรวจสอบค่าคงที่สำหรับตั๋วแบบยืน
   */
  private static validateStandingTicketConstants(): void {
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

  /**
   * คำนวณราคาสำหรับการเปลี่ยนที่นั่ง
   */
  static calculateSeatPricing(
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
    const commission = seatCount * COMMISSION_RATES.SEAT;

    return { totalAmount, commission };
  }
}
