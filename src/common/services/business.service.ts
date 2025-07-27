// ========================================
// 🎯 BUSINESS SERVICE LAYER
// ========================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
import { ApiResponse, PaginatedResponse, ValidationError } from '../types';

// Validation
import { ValidationHelper, BusinessValidation } from '../validation';
import { ThailandTimeHelper } from '../utils/thailand-time.helper';

// ========================================
// 🔧 BUSINESS LOGIC HELPERS
// ========================================

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(private readonly configService: ConfigService) {}

  // ========================================
  // 💰 PRICE CALCULATION
  // ========================================

  calculateTicketPrice(
    ticketType: string,
    quantity: number,
    userRole: string,
  ): { basePrice: number; discount: number; total: number } {
    const basePrices = {
      VIP: 5000,
      PREMIUM: 3000,
      STANDARD: 2000,
      STANDING: 1000,
    };

    const basePrice = basePrices[ticketType as keyof typeof basePrices] || 0;

    // Staff และ Admin ได้ส่วนลด
    const discountRates = {
      USER: 0,
      STAFF: 0.1, // 10% discount
      ADMIN: 0.2, // 20% discount
    };

    const discountRate =
      discountRates[userRole as keyof typeof discountRates] || 0;
    const discount = basePrice * quantity * discountRate;
    const total = basePrice * quantity - discount;

    return { basePrice, discount, total };
  }

  calculateCommission(
    totalAmount: number,
    referrerCode?: string,
  ): { commission: number; referrerCommission: number } {
    const baseCommissionRate = 0.05; // 5% base commission
    const referrerCommissionRate = 0.02; // 2% referrer commission

    const commission = totalAmount * baseCommissionRate;
    const referrerCommission = referrerCode
      ? totalAmount * referrerCommissionRate
      : 0;

    return { commission, referrerCommission };
  }

  // ========================================
  // 📅 DATE & TIME UTILITIES
  // ========================================

  generateExpirationDate(hours: number = 24): Date {
    const now = ThailandTimeHelper.now();
    return ThailandTimeHelper.add(now, hours, 'hour');
  }

  isWithinBookingTime(showDate: Date): boolean {
    const now = ThailandTimeHelper.now();
    const timeDiff = showDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    return hoursDiff >= 2 && hoursDiff <= 24 * 30; // 2 hours to 30 days
  }

  formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ========================================
  // 🔢 REFERENCE GENERATION
  // ========================================

  generateOrderReference(): string {
    const prefix = 'ORD';
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  generateTicketReference(): string {
    const prefix = 'TKT';
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  generateQRCode(orderId: string, seatNumber?: string): string {
    const data = {
      orderId,
      seatNumber,
      timestamp: Date.now(),
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  // ========================================
  // 🛡️ VALIDATION SERVICES
  // ========================================

  validateOrderData(data: {
    ticketType: string;
    quantity: number;
    showDate: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
  }): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required fields
    if (!data.ticketType) {
      errors.push({
        field: 'ticketType',
        message: 'กรุณาเลือกประเภทบัตร',
        code: 'REQUIRED',
      });
    }

    if (!data.quantity || data.quantity < 1) {
      errors.push({
        field: 'quantity',
        message: 'จำนวนบัตรต้องอย่างน้อย 1 ใบ',
        code: 'INVALID_QUANTITY',
      });
    }

    if (!data.showDate) {
      errors.push({
        field: 'showDate',
        message: 'กรุณาระบุวันที่แสดง',
        code: 'REQUIRED',
      });
    }

    if (!data.customerName) {
      errors.push({
        field: 'customerName',
        message: 'กรุณาระบุชื่อผู้จอง',
        code: 'REQUIRED',
      });
    }

    // Email validation
    if (
      data.customerEmail &&
      !ValidationHelper.isValidEmail(data.customerEmail)
    ) {
      errors.push({
        field: 'customerEmail',
        message: 'รูปแบบอีเมลไม่ถูกต้อง',
        code: 'INVALID_EMAIL',
      });
    }

    // Phone validation
    if (
      data.customerPhone &&
      !ValidationHelper.isValidPhone(data.customerPhone)
    ) {
      errors.push({
        field: 'customerPhone',
        message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง',
        code: 'INVALID_PHONE',
      });
    }

    // Show date validation
    if (data.showDate && !ValidationHelper.isDateInFuture(data.showDate)) {
      errors.push({
        field: 'showDate',
        message: 'วันที่แสดงต้องเป็นวันในอนาคต',
        code: 'INVALID_DATE',
      });
    }

    return errors;
  }

  validateBookingLimits(
    userRole: string,
    requestedQuantity: number,
    existingOrders: number,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const validation = BusinessValidation.validateBookingPermission(
      userRole,
      requestedQuantity,
      existingOrders,
    );

    if (!validation.isValid) {
      errors.push({
        field: 'quantity',
        message: validation.message || 'จำนวนบัตรที่จองเกินขีดจำกัด',
        code: 'BOOKING_LIMIT_EXCEEDED',
      });
    }

    return errors;
  }

  validatePaymentData(data: {
    amount: number;
    method: string;
    transactionId?: string;
  }): ValidationError[] {
    const errors: ValidationError[] = [];

    const validation = BusinessValidation.validatePayment(
      data.amount,
      data.method,
      data.transactionId,
    );

    if (!validation.isValid) {
      errors.push({
        field: 'payment',
        message: validation.message || 'ข้อมูลการชำระเงินไม่ถูกต้อง',
        code: 'INVALID_PAYMENT',
      });
    }

    return errors;
  }

  // ========================================
  // 📊 ANALYTICS HELPERS
  // ========================================

  calculateOrderStats(orders: any[]): {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    statusBreakdown: Record<string, number>;
  } {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const statusBreakdown = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      statusBreakdown,
    };
  }

  // ========================================
  // 🎟️ TICKET GENERATION
  // ========================================

  generateTicketData(
    orderId: string,
    seatNumbers: string[],
    ticketType: string,
    price: number,
  ): Array<{
    id: string;
    orderId: string;
    seatNumber: string;
    ticketType: string;
    price: number;
    qrCode: string;
    reference: string;
  }> {
    return seatNumbers.map((seatNumber) => ({
      id: this.generateUUID(),
      orderId,
      seatNumber,
      ticketType,
      price,
      qrCode: this.generateQRCode(orderId, seatNumber),
      reference: this.generateTicketReference(),
    }));
  }

  // ========================================
  // 🔧 UTILITY METHODS
  // ========================================

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  sanitizeInput(input: string): string {
    return ValidationHelper.sanitizeInput(input);
  }

  createSuccessResponse<T>(
    data: T,
    message: string = 'ดำเนินการสำเร็จ',
    path?: string,
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date(),
      path,
    };
  }

  createErrorResponse(
    message: string,
    errors?: ValidationError[],
    path?: string,
  ): ApiResponse {
    return {
      success: false,
      message: message || 'เกิดข้อผิดพลาดในการดำเนินการ',
      errors,
      timestamp: new Date(),
      path,
    };
  }

  createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): PaginatedResponse<T> {
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}
