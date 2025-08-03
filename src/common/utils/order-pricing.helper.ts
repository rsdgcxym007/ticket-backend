// ========================================
// 💰 ORDER PRICING HELPER
// ========================================

import { InternalServerErrorException } from '@nestjs/common';

// Enums
import { TicketType } from '../enums';

// Constants
import { TICKET_PRICES, COMMISSION_RATES } from '../constants';

export interface PricingResult {
  totalAmount: number;
  commission: number;
  pricePerSeat?: number;
  commissionPerTicket?: number;
}

export interface CreateOrderRequest {
  ticketType: TicketType;
  quantity?: number;
  seatIds?: string[];
  standingAdultQty?: number;
  standingChildQty?: number;
}

export class OrderPricingHelper {
  /**
   * 💰 คำนวณราคาสำหรับออเดอร์ทั่วไป
   */
  static calculateOrderPricing(request: CreateOrderRequest): PricingResult {
    const { ticketType, quantity = 0, seatIds = [] } = request;

    if (ticketType === TicketType.STANDING) {
      return this.calculateStandingTicketPricing(request);
    } else {
      return this.calculateSeatTicketPricing(ticketType, quantity, seatIds);
    }
  }

  /**
   * 🎫 คำนวณราคาสำหรับตั๋วยืน
   */
  static calculateStandingTicketPricing(
    request: CreateOrderRequest,
  ): PricingResult {
    const adultQty = request.standingAdultQty || 0;
    const childQty = request.standingChildQty || 0;

    // ตรวจสอบค่าคงที่
    this.validateConstants(['STANDING_ADULT', 'STANDING_CHILD']);

    const adultTotal = adultQty * TICKET_PRICES.STANDING_ADULT;
    const childTotal = childQty * TICKET_PRICES.STANDING_CHILD;
    const totalAmount = adultTotal + childTotal;

    const adultCommission = adultQty * COMMISSION_RATES.STANDING_ADULT;
    const childCommission = childQty * COMMISSION_RATES.STANDING_CHILD;
    const commission = adultCommission + childCommission;

    // ตรวจสอบผลลัพธ์
    if (isNaN(totalAmount) || isNaN(commission)) {
      throw new InternalServerErrorException(
        'ไม่สามารถคำนวณราคาตั๋วยืนได้ กรุณาติดต่อเจ้าหน้าที่',
      );
    }

    return {
      totalAmount,
      commission,
    };
  }

  /**
   * 🪑 คำนวณราคาสำหรับตั๋วที่นั่ง
   */
  static calculateSeatTicketPricing(
    ticketType: TicketType,
    quantity: number,
    seatIds: string[],
  ): PricingResult {
    const pricePerSeat = TICKET_PRICES[ticketType];
    const commissionPerTicket = COMMISSION_RATES.SEAT;

    // ตรวจสอบค่าคงที่
    if (
      typeof pricePerSeat !== 'number' ||
      typeof commissionPerTicket !== 'number'
    ) {
      throw new InternalServerErrorException(
        `ราคาตั๋วหรือค่าคอมมิชชั่นไม่ถูกต้องสำหรับประเภท: ${ticketType}`,
      );
    }

    const totalSeats = quantity + seatIds.length;
    const totalAmount = totalSeats * pricePerSeat;
    const commission = totalSeats * commissionPerTicket;

    return {
      totalAmount,
      commission,
      pricePerSeat,
      commissionPerTicket,
    };
  }

  /**
   * 🔄 คำนวณราคาใหม่สำหรับการเปลี่ยนที่นั่ง
   */
  static calculateSeatPricing(
    ticketType: TicketType,
    seatCount: number,
  ): PricingResult {
    const pricePerSeat = TICKET_PRICES[ticketType];

    if (typeof pricePerSeat !== 'number') {
      throw new InternalServerErrorException(
        `ราคาตั๋วไม่ถูกต้องสำหรับประเภท: ${ticketType}`,
      );
    }

    const totalAmount = seatCount * pricePerSeat;
    const commission = seatCount * COMMISSION_RATES.SEAT;

    return { totalAmount, commission };
  }

  /**
   * 📊 คำนวณสรุปยอดขายสำหรับรายงาน
   */
  static calculateOrdersSummary(orders: any[]): {
    totalOrders: number;
    totalAmount: number;
    totalCommission: number;
    statusBreakdown: Record<string, number>;
    purchaseTypeBreakdown: Record<string, number>;
    attendanceStatusBreakdown: Record<string, number>;
    ticketTypeBreakdown: Record<string, number>;
  } {
    const summary = {
      totalOrders: orders.length,
      totalAmount: 0,
      totalCommission: 0,
      statusBreakdown: {} as Record<string, number>,
      purchaseTypeBreakdown: {} as Record<string, number>,
      attendanceStatusBreakdown: {} as Record<string, number>,
      ticketTypeBreakdown: {} as Record<string, number>,
    };

    orders.forEach((order) => {
      // รวมยอดเงิน
      summary.totalAmount += Number(order.totalAmount) || 0;
      summary.totalCommission +=
        (Number(order.referrerCommission) || 0) +
        (Number(order.standingCommission) || 0);

      // นับตาม status
      const status = order.status || 'UNKNOWN';
      summary.statusBreakdown[status] =
        (summary.statusBreakdown[status] || 0) + 1;

      // นับตาม purchaseType
      const purchaseType = order.purchaseType || 'ONSITE';
      summary.purchaseTypeBreakdown[purchaseType] =
        (summary.purchaseTypeBreakdown[purchaseType] || 0) + 1;

      // นับตาม attendanceStatus
      const attendanceStatus = order.attendanceStatus || 'PENDING';
      summary.attendanceStatusBreakdown[attendanceStatus] =
        (summary.attendanceStatusBreakdown[attendanceStatus] || 0) + 1;

      // นับตาม ticketType
      const ticketType = order.ticketType || 'UNKNOWN';
      summary.ticketTypeBreakdown[ticketType] =
        (summary.ticketTypeBreakdown[ticketType] || 0) + 1;
    });

    return summary;
  }

  /**
   * ✅ ตรวจสอบค่าคงที่ราคาและคอมมิชชั่น
   */
  private static validateConstants(ticketTypes: string[]): void {
    for (const type of ticketTypes) {
      if (
        typeof TICKET_PRICES[type] !== 'number' ||
        typeof COMMISSION_RATES[type] !== 'number'
      ) {
        throw new InternalServerErrorException(
          `ค่าคงที่ราคาหรือคอมมิชชั่นไม่ถูกต้องสำหรับ: ${type}`,
        );
      }
    }
  }

  /**
   * 🎯 ตรวจสอบราคาตั๋วสำหรับประเภทเฉพาะ
   */
  static getTicketPrice(ticketType: TicketType): number {
    const price = TICKET_PRICES[ticketType];
    if (typeof price !== 'number') {
      throw new InternalServerErrorException(
        `ไม่พบราคาตั๋วสำหรับประเภท: ${ticketType}`,
      );
    }
    return price;
  }

  /**
   * 💸 ตรวจสอบค่าคอมมิชชั่นสำหรับประเภทเฉพาะ
   */
  static getCommissionRate(ticketType: TicketType): number {
    let commission: number;

    if (ticketType === TicketType.STANDING) {
      commission = COMMISSION_RATES.STANDING_ADULT; // ใช้ adult rate เป็นค่าเริ่มต้น
    } else {
      commission = COMMISSION_RATES.SEAT;
    }

    if (typeof commission !== 'number') {
      throw new InternalServerErrorException(
        `ไม่พบค่าคอมมิชชั่นสำหรับประเภท: ${ticketType}`,
      );
    }

    return commission;
  }
}
