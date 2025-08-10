// ========================================
// 🗺️ ORDER DATA MAPPER
// ========================================
// Centralized order data transformation logic

import { Order } from '../order.entity';
import { PaymentMethod, PaymentStatus } from '../../common/enums';
import { DateTimeHelper } from '../../common/utils';

export interface OrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  email?: string;
  ticketType: string;
  quantity: number;
  price: number;
  totalAmount: number;
  total: number;
  status: string;
  referrerCommission?: number;
  paymentMethod: PaymentMethod;
  paymentAmount?: number;
  outstandingAmount?: number;
  paymentStatus: PaymentStatus;
  showDate: string;
  createdAt: Date;
  updatedAt?: Date;
  expiresAt?: Date;
  source?: string;
  purchaseType?: string;
  attendanceStatus?: string;
  note?: string;
  createdBy?: string;
  createdById?: string;
  createdByName?: string;
  updatedBy?: string;
  paidByName?: string;
  lastUpdatedByName?: string;
  standingAdultQty?: number;
  standingChildQty?: number;
  standingTotal?: number;
  standingCommission?: number;
  referrer?: {
    id: string;
    code: string;
    name: string;
  } | null;
  seats?: Array<{
    id: string;
    seatNumber: string;
    zone: {
      id: string;
      name: string;
    } | null;
  }>;
  // Hotel booking fields
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
  // Additional fields
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

export interface TicketData {
  tickets: Ticket[];
  totalTickets: number;
}

export interface Ticket {
  orderId: string;
  id: string;
  orderNumber: string;
  seatNumber: string | null;
  type: string;
  ticketCategory: 'ADULT' | 'CHILD' | 'SEAT';
  zone: any;
  customerName: string;
  showDate: string;
  qrCode: string;
}

export class OrderDataMapper {
  /**
   * 🗺️ แปลง Order Entity เป็น OrderData
   */
  static mapToOrderData(order: Order): OrderData {
    const createdById = order.createdBy || order.userId;
    const createdByName = order.user?.name || null;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      email: order.customerEmail,
      ticketType: order.ticketType,
      quantity: order.quantity,
      price: order.totalAmount,
      total: order.total,
      totalAmount: order.totalAmount,
      status: order.status,
      referrerCommission: order.referrerCommission,
      paymentMethod: order.paymentMethod || PaymentMethod.CASH,
      paymentStatus: order?.payment?.status || PaymentStatus.PENDING,
      paymentAmount: order.payment?.amount || 0,
      outstandingAmount: order.outstandingAmount || 0,
      showDate: DateTimeHelper.formatDate(order.showDate),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      expiresAt: order.expiresAt,
      source: order.source,
      purchaseType: order.purchaseType,
      attendanceStatus: order.attendanceStatus,
      note: order.note,
      createdBy: createdById,
      createdById,
      createdByName,
      updatedBy: order.updatedBy,
      paidByName: this.resolvePaidByName(order),
      lastUpdatedByName: this.resolveLastUpdatedByName(order),
      standingAdultQty: order.standingAdultQty,
      standingChildQty: order.standingChildQty,
      standingTotal: order.standingTotal,
      standingCommission: order.standingCommission,
      referrer: this.mapReferrer(order),
      seats: this.mapSeats(order),
      // Hotel booking fields
      hotelName: order.hotelName,
      hotelDistrict: order.hotelDistrict,
      roomNumber: order.roomNumber,
      adultCount: order.adultCount,
      childCount: order.childCount,
      infantCount: order.infantCount,
      voucherNumber: order.voucherNumber,
      pickupScheduledTime: order.pickupScheduledTime,
      bookerName: order.bookerName,
      includesPickup: order.includesPickup,
      includesDropoff: order.includesDropoff,
      // Additional fields
      requiresPickup: order.requiresPickup,
      requiresDropoff: order.requiresDropoff,
      pickupHotel: order.pickupHotel,
      dropoffLocation: order.dropoffLocation,
      pickupTime: order.pickupTime,
      dropoffTime: order.dropoffTime,
      travelDate: order.travelDate
        ? DateTimeHelper.formatDate(order.travelDate)
        : undefined,
      voucherCode: order.voucherCode,
      referenceNo: order.referenceNo,
      specialRequests: order.specialRequests,
    };
  }

  /**
   * 📋 แปลงหลาย Orders เป็น OrderData array
   */
  static mapOrdersToData(orders: Order[]): OrderData[] {
    return orders.map((order) => this.mapToOrderData(order));
  }

  /**
   * 📊 แปลงสำหรับ Export
   */
  static mapToExportData(order: OrderData): Record<string, any> {
    return {
      orderNumber: order.orderNumber,
      customerName: order.customerName || '-',
      customerPhone: order.customerPhone || '-',
      customerEmail: order.email || '-',
      ticketType: order.ticketType || '-',
      referrerName: order.referrer?.name || '-',
      quantity: order.quantity || 0,
      standingAdultQty: order.standingAdultQty || 0,
      standingChildQty: order.standingChildQty || 0,
      totalAmount: order.totalAmount || 0,
      status: order.status,
      purchaseType: order.purchaseType || 'ONSITE',
      attendanceStatus: order.attendanceStatus || 'PENDING',
      paymentMethod: order.paymentMethod || PaymentMethod.CASH,
      showDate: order.showDate
        ? new Date(order.showDate).toISOString().split('T')[0]
        : '-',
      createdAt: order.createdAt
        ? new Date(order.createdAt).toISOString()
        : '-',
      createdByName: order.createdByName || '-',
      referrerCode: order.referrer?.code || '-',
      referrerCommission: order.referrerCommission || 0,
      standingCommission: order.standingCommission || 0,
      note: order.note || '-',
      seats: order.seats
        ? order.seats.map((s: any) => s.seatNumber).join(', ')
        : '-',
      // Hotel booking fields
      hotelName: order.hotelName || '-',
      hotelDistrict: order.hotelDistrict || '-',
      roomNumber: order.roomNumber || '-',
      adultCount: order.adultCount || 0,
      childCount: order.childCount || 0,
      infantCount: order.infantCount || 0,
      voucherNumber: order.voucherNumber || '-',
      pickupScheduledTime: order.pickupScheduledTime || '-',
      bookerName: order.bookerName || '-',
      includesPickup: order.includesPickup || false,
      includesDropoff: order.includesDropoff || false,
      // Additional fields
      requiresPickup: order.requiresPickup || false,
      requiresDropoff: order.requiresDropoff || false,
      pickupHotel: order.pickupHotel || '-',
      dropoffLocation: order.dropoffLocation || '-',
      pickupTime: order.pickupTime || '-',
      dropoffTime: order.dropoffTime || '-',
      travelDate: order.travelDate || '-',
      voucherCode: order.voucherCode || '-',
      referenceNo: order.referenceNo || '-',
      specialRequests: order.specialRequests || '-',
    };
  }

  /**
   * 🎫 แปลงสำหรับ Ticket Generation
   */
  static mapToTicketData(order: Order): TicketData {
    const orderData = this.mapToOrderData(order);

    if (orderData.ticketType === 'STANDING') {
      return this.generateStandingTickets(orderData);
    } else {
      return this.generateSeatTickets(orderData);
    }
  }

  /**
   * 💳 ระบุชื่อผู้ชำระเงิน
   */
  private static resolvePaidByName(order: Order): string | null {
    if (order.payment?.user?.name) {
      return order.payment.user.name;
    }

    if (order.payment?.userId) {
      return order.user && order.payment.userId === order.user.id
        ? order.user.name
        : order.payment.userId;
    }

    if (order.payment?.createdById) {
      return order.user && order.payment.createdById === order.user.id
        ? order.user.name
        : order.payment.createdById;
    }

    return null;
  }

  /**
   * ✏️ ระบุชื่อผู้แก้ไขล่าสุด
   */
  private static resolveLastUpdatedByName(order: Order): string | null {
    return order.updatedBy === order.userId ? order.user?.name || null : null;
  }

  /**
   * 👥 แปลงข้อมูล Referrer
   */
  private static mapReferrer(order: Order): {
    id: string;
    code: string;
    name: string;
  } | null {
    if (!order.referrer) return null;

    return {
      id: order.referrer.id,
      code: order.referrer.code,
      name: order.referrer.name,
    };
  }

  /**
   * 🪑 แปลงข้อมูลที่นั่ง
   */
  private static mapSeats(order: Order): Array<{
    id: string;
    seatNumber: string;
    zone: {
      id: string;
      name: string;
    } | null;
  }> {
    if (!order.seatBookings) return [];

    return order.seatBookings.map((booking) => ({
      id: booking.seat.id,
      seatNumber: booking.seat.seatNumber,
      zone: booking.seat.zone
        ? {
            id: booking.seat.zone.id,
            name: booking.seat.zone.name,
          }
        : null,
    }));
  }

  /**
   * 🎟️ สร้างตั๋วยืน
   */
  private static generateStandingTickets(orderData: OrderData): TicketData {
    const tickets: Ticket[] = [];
    const adultQty = orderData.standingAdultQty || 0;
    const childQty = orderData.standingChildQty || 0;

    // สร้างตั๋วผู้ใหญ่
    for (let i = 1; i <= adultQty; i++) {
      tickets.push({
        orderId: orderData.id,
        id: `${orderData.id}_adult_${i}`,
        orderNumber: orderData.orderNumber,
        seatNumber: null,
        type: orderData.ticketType,
        ticketCategory: 'ADULT',
        zone: null,
        customerName: orderData.customerName,
        showDate: orderData.showDate,
        qrCode: `QR_${orderData.orderNumber}_STANDING_ADULT_${i}`,
      });
    }

    // สร้างตั๋วเด็ก
    for (let i = 1; i <= childQty; i++) {
      tickets.push({
        orderId: orderData.id,
        id: `${orderData.id}_child_${i}`,
        orderNumber: orderData.orderNumber,
        seatNumber: null,
        type: orderData.ticketType,
        ticketCategory: 'CHILD',
        zone: null,
        customerName: orderData.customerName,
        showDate: orderData.showDate,
        qrCode: `QR_${orderData.orderNumber}_STANDING_CHILD_${i}`,
      });
    }

    return { tickets, totalTickets: tickets.length };
  }

  /**
   * 🪑 สร้างตั๋วที่นั่ง
   */
  private static generateSeatTickets(orderData: OrderData): TicketData {
    const tickets: Ticket[] = (orderData.seats || []).map((seat) => ({
      orderId: orderData.id,
      id: seat.id,
      orderNumber: orderData.orderNumber,
      seatNumber: seat.seatNumber,
      type: orderData.ticketType,
      ticketCategory: 'SEAT',
      zone: seat.zone,
      customerName: orderData.customerName,
      showDate: orderData.showDate,
      qrCode: `QR_${orderData.orderNumber}_${seat.seatNumber}`,
    }));

    return { tickets, totalTickets: tickets.length };
  }
}
