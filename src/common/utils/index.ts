// ========================================
// 🎯 UTILITY FUNCTIONS - ฟังก์ชันที่ใช้งานร่วมกัน
// ========================================

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  TICKET_PRICES,
  COMMISSION_RATES,
  REFERENCE_PREFIXES,
  LOCALIZATION,
} from '../constants';
import {
  TicketType,
  StandingTicketType,
  OrderStatus,
  PaymentStatus,
} from '../enums';
import { StandingTicketData, OrderData } from '../interfaces';
import { ThailandTimeHelper } from './thailand-time.helper';

dayjs.extend(utc);
dayjs.extend(timezone);

// 🌍 Export Enhanced Utilities
export { ThailandTimeHelper, ThaiTime } from './thailand-time.helper';
export { ApiResponseHelper } from './api-response.helper';
export { DatabaseHelper } from './database.helper';
export { LoggingHelper } from './logging.helper';
export { ErrorHandlingHelper } from './error-handling.helper';
export { AuditHelper } from './audit.helper';

// 💰 คำนวณราคาตั๋ว
class PriceCalculator {
  static calculateSeatPrice(ticketType: TicketType, quantity: number): number {
    const pricePerSeat = TICKET_PRICES[ticketType] || TICKET_PRICES.STADIUM;
    return pricePerSeat * quantity;
  }

  static calculateStandingPrice(
    adultQty: number = 0,
    childQty: number = 0,
  ): number {
    return (
      adultQty * TICKET_PRICES.STANDING_ADULT +
      childQty * TICKET_PRICES.STANDING_CHILD
    );
  }

  static calculateCommission(
    ticketType: TicketType,
    quantity: number,
    standingTickets?: StandingTicketData[],
  ): number {
    let commission = 0;

    // คำนวณค่าคอมจากที่นั่ง
    if (ticketType !== TicketType.STANDING) {
      commission += quantity * COMMISSION_RATES.SEAT;
    }

    // คำนวณค่าคอมจากตั๋วยืน
    if (standingTickets) {
      for (const ticket of standingTickets) {
        if (ticket.type === StandingTicketType.ADULT) {
          commission += ticket.quantity * COMMISSION_RATES.STANDING_ADULT;
        } else if (ticket.type === StandingTicketType.CHILD) {
          commission += ticket.quantity * COMMISSION_RATES.STANDING_CHILD;
        }
      }
    }

    return commission;
  }

  static calculateTotalAmount(
    ticketType: TicketType,
    quantity: number,
    standingTickets?: StandingTicketData[],
  ): number {
    let total = 0;

    // ราคาที่นั่ง
    if (ticketType !== TicketType.STANDING) {
      total += this.calculateSeatPrice(ticketType, quantity);
    }

    // ราคาตั๋วยืน
    if (standingTickets) {
      for (const ticket of standingTickets) {
        if (ticket.type === StandingTicketType.ADULT) {
          total += ticket.quantity * TICKET_PRICES.STANDING_ADULT;
        } else if (ticket.type === StandingTicketType.CHILD) {
          total += ticket.quantity * TICKET_PRICES.STANDING_CHILD;
        }
      }
    }

    return total;
  }
}

// 📅 จัดการวันที่และเวลา (Updated to use Thailand Time)
class DateTimeHelper {
  static now(): Date {
    return ThailandTimeHelper.now();
  }

  static formatDate(date: Date | string, format?: string): string {
    return ThailandTimeHelper.format(date, format || LOCALIZATION.DATE_FORMAT);
  }

  static formatDateTime(date: Date | string, format?: string): string {
    return ThailandTimeHelper.formatDateTime(
      date,
      format || LOCALIZATION.DATETIME_FORMAT,
    );
  }

  static addMinutes(date: Date, minutes: number): Date {
    return ThailandTimeHelper.add(date, minutes, 'minute');
  }

  static addHours(date: Date, hours: number): Date {
    return ThailandTimeHelper.add(date, hours, 'hour');
  }

  static addDays(date: Date, days: number): Date {
    return ThailandTimeHelper.add(date, days, 'day');
  }

  static isExpired(expiresAt: Date): boolean {
    return ThailandTimeHelper.isExpired(expiresAt);
  }

  static timeUntilExpiry(expiresAt: Date): number {
    return ThailandTimeHelper.getMinutesUntilExpiry(expiresAt);
  }

  static startOfDay(date: Date | string): Date {
    return dayjs(date).tz(LOCALIZATION.TIMEZONE).startOf('day').toDate();
  }

  static endOfDay(date: Date | string): Date {
    return dayjs(date).tz(LOCALIZATION.TIMEZONE).endOf('day').toDate();
  }

  static startOfWeek(date: Date): Date {
    return dayjs(date).tz(LOCALIZATION.TIMEZONE).startOf('week').toDate();
  }

  static endOfWeek(date: Date): Date {
    return dayjs(date).tz(LOCALIZATION.TIMEZONE).endOf('week').toDate();
  }

  static isSameDay(date1: Date | string, date2: Date | string): boolean {
    return dayjs(date1).isSame(dayjs(date2), 'day');
  }

  static isToday(date: Date | string): boolean {
    return this.isSameDay(date, this.now());
  }

  static isFuture(date: Date | string): boolean {
    return dayjs(date).isAfter(dayjs());
  }

  static isPast(date: Date | string): boolean {
    return dayjs(date).isBefore(dayjs());
  }
}

// 🏷️ สร้างรหัสอ้างอิง
class ReferenceGenerator {
  static generateOrderNumber(): string {
    const timePart = Date.now().toString(36).slice(-2);
    const perfPart = Math.floor(performance.now() % 100).toString(36);
    const randPart = Math.random().toString(36).substr(2, 3);
    return `${REFERENCE_PREFIXES.ORDER}-${timePart}${perfPart}${randPart}`.toUpperCase();
  }

  static generatePaymentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${REFERENCE_PREFIXES.PAYMENT}-${timestamp}${random}`.toUpperCase();
  }

  static generateRefundId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${REFERENCE_PREFIXES.REFUND}-${timestamp}${random}`.toUpperCase();
  }

  static generateVoucherCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateInvoiceNumber(): string {
    const date = dayjs().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 9999) + 1;
    return `${REFERENCE_PREFIXES.INVOICE}-${date}-${random.toString().padStart(4, '0')}`;
  }

  static generateQRCode(orderId: string, customerId: string): string {
    const data = `${orderId}|${customerId}|${Date.now()}`;
    return Buffer.from(data).toString('base64');
  }
}

// 🔧 ตัวช่วยสำหรับ Validation
class ValidationHelper {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+66|0)[0-9]{8,9}$/;
    return phoneRegex.test(phone);
  }

  static isValidDate(date: string): boolean {
    return dayjs(date).isValid();
  }

  static isValidOrderNumber(orderNumber: string): boolean {
    const pattern = new RegExp(`^${REFERENCE_PREFIXES.ORDER}-[A-Z0-9]+$`);
    return pattern.test(orderNumber);
  }

  static isValidSeatNumber(seatNumber: string): boolean {
    const seatRegex = /^[A-Z]\d{1,3}$/;
    return seatRegex.test(seatNumber);
  }

  static isValidAmount(amount: number): boolean {
    return amount > 0 && amount <= 999999;
  }

  static isStrongPassword(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  }
}

// 🎯 ตัวช่วยสำหรับ Business Logic
class BusinessLogicHelper {
  static canCancelOrder(order: OrderData): boolean {
    // ไม่สามารถยกเลิกถ้าชำระเงินแล้วหรือเริ่มการแสดงแล้ว
    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.CONFIRMED
    ) {
      const showDate = dayjs(order.showDate);
      const now = dayjs();
      const hoursUntilShow = showDate.diff(now, 'hour');
      return hoursUntilShow > 2; // ยกเลิกได้ก่อนการแสดง 2 ชั่วโมง
    }

    return [OrderStatus.PENDING, OrderStatus.PENDING_SLIP].includes(
      OrderStatus[order.status],
    );
  }

  static canRefundOrder(order: OrderData): boolean {
    if (order.status !== OrderStatus.PAID) return false;

    const daysSincePayment = dayjs().diff(dayjs(order.updatedAt), 'day');
    return daysSincePayment <= 7; // คืนเงินได้ภายใน 7 วัน
  }

  static calculateExpiryTime(createdAt: Date, minutes: number = 5): Date {
    return DateTimeHelper.addMinutes(createdAt, minutes);
  }

  static isOrderExpired(order: OrderData): boolean {
    if (!order.expiresAt) return false;
    return DateTimeHelper.isExpired(order.expiresAt);
  }

  static getOrderStatusColor(status: OrderStatus): string {
    const colors = {
      [OrderStatus.PENDING]: '#FFA500',
      [OrderStatus.PENDING_SLIP]: '#FFD700',
      [OrderStatus.PAID]: '#32CD32',
      [OrderStatus.CONFIRMED]: '#228B22',
      [OrderStatus.CANCELLED]: '#DC143C',
      [OrderStatus.EXPIRED]: '#808080',
      [OrderStatus.BOOKED]: '#1E90FF',
      [OrderStatus.REFUNDED]: '#9932CC',
      [OrderStatus.NO_SHOW]: '#696969',
    };
    return colors[status] || '#000000';
  }

  static getPaymentStatusColor(status: PaymentStatus): string {
    const colors = {
      [PaymentStatus.PENDING]: '#FFA500',
      [PaymentStatus.PROCESSING]: '#FFD700',
      [PaymentStatus.PAID]: '#32CD32',
      [PaymentStatus.FAILED]: '#DC143C',
      [PaymentStatus.REFUNDED]: '#9932CC',
    };
    return colors[status] || '#000000';
  }
}

// 📊 ตัวช่วยสำหรับการรายงาน
class ReportHelper {
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: LOCALIZATION.CURRENCY,
    }).format(amount);
  }

  static formatNumber(number: number): string {
    return new Intl.NumberFormat('th-TH').format(number);
  }

  static formatPercentage(value: number, total: number): string {
    if (total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(1)}%`;
  }

  static calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  static groupByDate(
    data: Array<{ date: Date | string; value: number }>,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ): Array<{ date: string; value: number }> {
    const grouped = new Map<string, number>();

    data.forEach((item) => {
      const key = dayjs(item.date).startOf(groupBy).format('YYYY-MM-DD');
      grouped.set(key, (grouped.get(key) || 0) + item.value);
    });

    return Array.from(grouped.entries()).map(([date, value]) => ({
      date,
      value,
    }));
  }
}

// 🎨 ตัวช่วยสำหรับ UI/UX
class UIHelper {
  static getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static getRandomColor(): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FECA57',
      '#FF9FF3',
      '#54A0FF',
      '#5F27CD',
      '#00D2D3',
      '#FF9F43',
      '#10AC84',
      '#EE5A52',
      '#0ABDE3',
      '#FD79A8',
      '#FDCB6E',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  static generateAvatar(name: string, size: number = 40): string {
    const initials = this.getInitials(name);
    const color = this.getRandomColor();
    return `https://ui-avatars.com/api/?name=${initials}&background=${color.slice(1)}&color=fff&size=${size}`;
  }
}

// 🔍 ตัวช่วยสำหรับการค้นหา
class SearchHelper {
  static normalizeSearchTerm(term: string): string {
    return term.toLowerCase().trim();
  }

  static buildSearchQuery(term: string, fields: string[]): Record<string, any> {
    const normalizedTerm = this.normalizeSearchTerm(term);

    return {
      $or: fields.map((field) => ({
        [field]: { $regex: normalizedTerm, $options: 'i' },
      })),
    };
  }

  static highlightSearchTerm(text: string, term: string): string {
    if (!term) return text;

    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

// 🎯 Export ทั้งหมด
export {
  PriceCalculator,
  DateTimeHelper,
  ReferenceGenerator,
  ValidationHelper,
  BusinessLogicHelper,
  ReportHelper,
  UIHelper,
  SearchHelper,
};

// ✨ Export helpers ใหม่ที่ refactor แล้ว
export { OrderValidationHelper } from './order-validation.helper';
export { OrderPricingHelper } from './order-pricing.helper';
// Removed OrderDataMapper - moved to src/order/mappers/order-data.mapper.ts
