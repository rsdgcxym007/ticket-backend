// ========================================
// 🛡️ CENTRAL VALIDATION SYSTEM
// ========================================

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
  ValidationError,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { ThailandTimeHelper } from '../utils/thailand-time.helper';

// ========================================
// 🔧 CUSTOM VALIDATORS
// ========================================

@ValidatorConstraint({ name: 'isDateInFuture', async: false })
export class IsDateInFutureConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) return true; // Allow empty values
    const date = ThailandTimeHelper.toThailandTime(value);
    const now = ThailandTimeHelper.now();
    return date > now;
  }

  defaultMessage() {
    return 'Date must be in the future';
  }
}

@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) return true; // Allow empty values
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(value);
  }

  defaultMessage() {
    return 'Phone number must be 10 digits';
  }
}

@ValidatorConstraint({ name: 'isReferenceNo', async: false })
export class IsReferenceNoConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) return true; // Allow empty values
    const refRegex = /^[A-Z0-9]{8,12}$/;
    return refRegex.test(value);
  }

  defaultMessage() {
    return 'Reference number must be 8-12 alphanumeric characters';
  }
}

// ========================================
// 🎯 DECORATOR FUNCTIONS
// ========================================

export function IsDateInFuture(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDateInFutureConstraint,
    });
  };
}

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

export function IsReferenceNo(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsReferenceNoConstraint,
    });
  };
}

// ========================================
// 🔍 VALIDATION HELPER FUNCTIONS
// ========================================

export class ValidationHelper {
  /**
   * แปลง ValidationError เป็น format ที่เข้าใจง่าย
   */
  static formatErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];

    errors.forEach((error) => {
      if (error.constraints) {
        Object.values(error.constraints).forEach((constraint) => {
          messages.push(constraint);
        });
      }

      if (error.children && error.children.length > 0) {
        messages.push(...this.formatErrors(error.children));
      }
    });

    return messages;
  }

  /**
   * สร้าง BadRequestException จาก ValidationError
   */
  static createValidationException(
    errors: ValidationError[],
  ): BadRequestException {
    const messages = this.formatErrors(errors);
    return new BadRequestException({
      message: 'Validation failed',
      errors: messages,
    });
  }

  /**
   * ตรวจสอบว่าเป็นอีเมลหรือไม่
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * ตรวจสอบว่าเป็นเบอร์โทรหรือไม่
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  }

  /**
   * ตรวจสอบว่าเป็นรหัสอ้างอิงหรือไม่
   */
  static isValidReferenceNo(refNo: string): boolean {
    const refRegex = /^[A-Z0-9]{8,12}$/;
    return refRegex.test(refNo);
  }

  /**
   * ตรวจสอบว่าเป็นวันที่ในอนาคตหรือไม่
   */
  static isDateInFuture(date: string | Date): boolean {
    const targetDate = ThailandTimeHelper.toThailandTime(date);
    const now = ThailandTimeHelper.now();
    return targetDate > now;
  }

  /**
   * ตรวจสอบว่าเป็น UUID หรือไม่
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * ตรวจสอบจำนวนเงิน
   */
  static isValidAmount(amount: number): boolean {
    return amount >= 0 && amount <= 1000000; // Max 1 million
  }

  /**
   * ตรวจสอบจำนวนตั๋ว
   */
  static isValidQuantity(quantity: number): boolean {
    return quantity >= 1 && quantity <= 50; // Max 50 tickets per order
  }

  /**
   * ทำความสะอาดข้อมูล
   */
  static sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * ตรวจสอบรูปแบบรหัสผ่าน
   */
  static isValidPassword(password: string): boolean {
    // อย่างน้อย 8 ตัว, มีตัวเลขและตัวอักษร
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  }
}

// ========================================
// 🎯 BUSINESS VALIDATION RULES
// ========================================

export class BusinessValidation {
  /**
   * ตรวจสอบสิทธิ์ในการจองตั๋ว
   */
  static validateBookingPermission(
    userRole: string,
    requestedQuantity: number,
    existingOrders: number,
  ): { isValid: boolean; message?: string } {
    // ตรวจสอบตามบทบาทผู้ใช้
    const limits = {
      USER: { maxPerOrder: 10, maxTotal: 50 },
      STAFF: { maxPerOrder: 100, maxTotal: 500 },
      ADMIN: { maxPerOrder: 1000, maxTotal: 10000 },
    };

    const userLimits = limits[userRole as keyof typeof limits];
    if (!userLimits) {
      return { isValid: false, message: 'Invalid user role' };
    }

    if (requestedQuantity > userLimits.maxPerOrder) {
      return {
        isValid: false,
        message: `Cannot book more than ${userLimits.maxPerOrder} tickets per order`,
      };
    }

    if (existingOrders + requestedQuantity > userLimits.maxTotal) {
      return {
        isValid: false,
        message: `Cannot exceed total limit of ${userLimits.maxTotal} tickets`,
      };
    }

    return { isValid: true };
  }

  /**
   * ตรวจสอบการชำระเงิน
   */
  static validatePayment(
    amount: number,
    method: string,
    transactionId?: string,
  ): { isValid: boolean; message?: string } {
    if (amount <= 0) {
      return { isValid: false, message: 'Amount must be greater than 0' };
    }

    if (amount > 1000000) {
      return { isValid: false, message: 'Amount cannot exceed 1,000,000' };
    }

    const validMethods = ['BANK_TRANSFER', 'CREDIT_CARD', 'CASH'];
    if (!validMethods.includes(method)) {
      return { isValid: false, message: 'Invalid payment method' };
    }

    if (method !== 'CASH' && !transactionId) {
      return {
        isValid: false,
        message: 'Transaction ID is required for non-cash payments',
      };
    }

    return { isValid: true };
  }

  /**
   * ตรวจสอบเวลาการจอง
   */
  static validateBookingTime(
    showDate: Date,
    bookingDate: Date = ThailandTimeHelper.now(),
  ): { isValid: boolean; message?: string } {
    const timeDiff = showDate.getTime() - bookingDate.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 2) {
      return {
        isValid: false,
        message: 'Cannot book tickets less than 2 hours before show time',
      };
    }

    if (hoursDiff > 24 * 30) {
      return {
        isValid: false,
        message: 'Cannot book tickets more than 30 days in advance',
      };
    }

    return { isValid: true };
  }
}
