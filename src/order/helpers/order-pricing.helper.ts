import { CreateOrderRequest } from '../order.service';
import { TicketType } from '../../common/enums';
import { TICKET_PRICES, COMMISSION_RATES } from '../../common/constants';
import { InternalServerErrorException } from '@nestjs/common';

export class OrderPricingHelper {
  /**
   * คำนวณราคา order จาก request
   */
  static calculateOrderPricing(request: CreateOrderRequest): {
    totalAmount: number;
    commission: number;
  } {
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
   * คำนวณสรุปออเดอร์ทั้งหมด
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
      // Total amount
      summary.totalAmount += order.totalAmount || 0;

      // Total commission
      summary.totalCommission +=
        (order.referrerCommission || 0) + (order.standingCommission || 0);

      // Status breakdown
      const status = order.status || 'UNKNOWN';
      summary.statusBreakdown[status] =
        (summary.statusBreakdown[status] || 0) + 1;

      // Purchase type breakdown
      const purchaseType = order.purchaseType || 'UNKNOWN';
      summary.purchaseTypeBreakdown[purchaseType] =
        (summary.purchaseTypeBreakdown[purchaseType] || 0) + 1;

      // Attendance status breakdown
      const attendanceStatus = order.attendanceStatus || 'UNKNOWN';
      summary.attendanceStatusBreakdown[attendanceStatus] =
        (summary.attendanceStatusBreakdown[attendanceStatus] || 0) + 1;

      // Ticket type breakdown
      const ticketType = order.ticketType || 'UNKNOWN';
      summary.ticketTypeBreakdown[ticketType] =
        (summary.ticketTypeBreakdown[ticketType] || 0) + 1;
    });

    return summary;
  }
}
