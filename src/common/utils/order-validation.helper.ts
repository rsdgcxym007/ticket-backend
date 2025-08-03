// ========================================
// 🔍 ORDER VALIDATION HELPER
// ========================================

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository, In, Between } from 'typeorm';

// Entities
import { User } from '../../user/user.entity';
import { Seat } from '../../seats/seat.entity';
import { SeatBooking } from '../../seats/seat-booking.entity';
import { Order } from '../../order/order.entity';
import { Referrer } from '../../referrer/referrer.entity';

// Enums
import { UserRole, BookingStatus, OrderStatus } from '../enums';

// Constants
import { BOOKING_LIMITS } from '../constants';

// Utils
import { ThailandTimeHelper } from './thailand-time.helper';

export class OrderValidationHelper {
  /**
   * 🎫 ตรวจสอบขีดจำกัดการจอง
   */
  static async validateBookingLimits(
    user: User,
    totalSeats: number,
    orderRepo: Repository<Order>,
  ): Promise<void> {
    const limits = BOOKING_LIMITS[user.role] || BOOKING_LIMITS.user;

    // ตรวจสอบจำนวนที่นั่งต่อออเดอร์
    if (totalSeats > limits.maxSeatsPerOrder) {
      throw new ForbiddenException(
        `${user.role} สามารถจองได้สูงสุด ${limits.maxSeatsPerOrder} ที่นั่งต่อคำสั่ง`,
      );
    }

    // ตรวจสอบจำนวนออเดอร์ต่อวัน
    const today = ThailandTimeHelper.startOfDay(ThailandTimeHelper.now());
    const todayOrders = await orderRepo.count({
      where: {
        userId: user.id,
        createdAt: Between(today, ThailandTimeHelper.now()),
      },
    });

    if (todayOrders >= limits.maxOrdersPerDay) {
      throw new ForbiddenException(
        `${user.role} สามารถทำรายการได้สูงสุด ${limits.maxOrdersPerDay} ครั้งต่อวัน`,
      );
    }
  }

  /**
   * 🪑 ตรวจสอบความพร้อมใช้งานของที่นั่ง
   */
  static async validateSeatAvailability(
    seatIds: string[],
    showDate: string,
    seatRepo: Repository<Seat>,
    seatBookingRepo: Repository<SeatBooking>,
  ): Promise<void> {
    // ตรวจสอบที่นั่งที่มีอยู่
    const seats = await seatRepo.findByIds(seatIds);
    if (!seats || seats.length !== seatIds.length) {
      throw new BadRequestException('ไม่พบที่นั่งบางที่');
    }

    // ตรวจสอบที่นั่งที่ถูกจองแล้ว
    const bookedSeats = await seatBookingRepo.find({
      where: {
        seat: { id: In(seatIds) },
        showDate: showDate,
        status: In([
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.PAID,
        ]),
      },
    });

    if (bookedSeats.length > 0) {
      throw new BadRequestException('มีที่นั่งบางที่ถูกจองไปแล้ว');
    }
  }

  /**
   * 🪑 ตรวจสอบความพร้อมใช้งานของที่นั่ง (ยกเว้นออเดอร์ปัจจุบัน)
   */
  static async validateSeatAvailabilityExcludingOrder(
    seatIds: string[],
    showDate: string,
    excludeOrderId: string,
    seatRepo: Repository<Seat>,
    seatBookingRepo: Repository<SeatBooking>,
  ): Promise<void> {
    // ตรวจสอบที่นั่งที่มีอยู่
    const seats = await seatRepo.findByIds(seatIds);
    if (!seats || seats.length !== seatIds.length) {
      throw new BadRequestException('ไม่พบที่นั่งบางที่');
    }

    // ตรวจสอบที่นั่งที่ถูกจองแล้ว
    const bookedSeats = await seatBookingRepo.find({
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

    // กรองออเดอร์ปัจจุบันออก
    const conflictingBookings = bookedSeats.filter(
      (booking) => booking.order.id !== excludeOrderId,
    );

    if (conflictingBookings.length > 0) {
      const conflictingSeatNumbers = await Promise.all(
        conflictingBookings.map(async (booking) => {
          const seat = await seatRepo.findOne({
            where: { id: booking.seat.id },
          });
          return seat?.seatNumber || booking.seat.id;
        }),
      );

      throw new BadRequestException(
        `ที่นั่งหมายเลข ${conflictingSeatNumbers.join(', ')} ถูกจองไปแล้วในวันที่แสดงนี้`,
      );
    }
  }

  /**
   * 🎫 ตรวจสอบรหัสผู้แนะนำ
   */
  static async validateReferrer(
    referrerCode: string,
    referrerRepo: Repository<Referrer>,
  ): Promise<Referrer | null> {
    if (!referrerCode) return null;

    const referrer = await referrerRepo.findOne({
      where: { code: referrerCode, isActive: true },
    });

    if (!referrer) {
      throw new BadRequestException(
        'รหัสผู้แนะนำไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
      );
    }

    return referrer;
  }

  /**
   * 🔢 แปลงหมายเลขที่นั่งเป็น ID
   */
  static async convertSeatNumbersToIds(
    seatNumbers: string[],
    seatRepo: Repository<Seat>,
  ): Promise<string[]> {
    const seats = await seatRepo.find({
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

    return seats.map((seat) => seat.id);
  }

  /**
   * 👤 ตรวจสอบสิทธิ์การเข้าถึงออเดอร์
   */
  static validateOrderAccess(
    user: User,
    order: Order,
    action: 'VIEW' | 'UPDATE' | 'DELETE' | 'CANCEL',
  ): void {
    // USER สามารถจัดการเฉพาะออเดอร์ของตัวเอง
    if (user.role === UserRole.USER && order.userId !== user.id) {
      const actionText = {
        VIEW: 'ดู',
        UPDATE: 'แก้ไข',
        DELETE: 'ลบ',
        CANCEL: 'ยกเลิก',
      };
      throw new ForbiddenException(
        `คุณสามารถ${actionText[action]}เฉพาะออเดอร์ของตัวเองเท่านั้น`,
      );
    }

    // ตรวจสอบสถานะสำหรับการแก้ไข/ยกเลิก
    if (action === 'UPDATE' || action === 'CANCEL') {
      if (
        order.status === OrderStatus.CONFIRMED &&
        user.role !== UserRole.ADMIN
      ) {
        throw new BadRequestException('ไม่สามารถแก้ไขออเดอร์ที่ยืนยันแล้ว');
      }

      if (action === 'CANCEL' && order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('ออเดอร์นี้ถูกยกเลิกไปแล้ว');
      }
    }

    // เฉพาะ ADMIN เท่านั้นที่ลบได้
    if (action === 'DELETE' && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('เฉพาะแอดมินเท่านั้นที่สามารถลบออเดอร์');
    }
  }

  /**
   * 📊 ตรวจสอบสิทธิ์การยืนยันการชำระเงิน
   */
  static validatePaymentConfirmation(user: User, order: Order): void {
    // เฉพาะ STAFF และ ADMIN เท่านั้น
    if (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'เฉพาะสตาฟและแอดมินเท่านั้นที่ยืนยันการชำระเงินได้',
      );
    }

    // ตรวจสอบสถานะออเดอร์
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'สามารถยืนยันการชำระเงินเฉพาะออเดอร์ที่รอดำเนินการเท่านั้น',
      );
    }
  }

  /**
   * 🎟️ ตรวจสอบสิทธิ์การออกตั๋ว
   */
  static validateTicketGeneration(user: User, order: Order): void {
    // ตรวจสอบสิทธิ์การเข้าถึง
    if (user.role === UserRole.USER && order.userId !== user.id) {
      throw new ForbiddenException(
        'คุณสามารถออกตั๋วเฉพาะออเดอร์ของตัวเองเท่านั้น',
      );
    }

    // ตรวจสอบสถานะออเดอร์
    if (![OrderStatus.CONFIRMED, OrderStatus.PAID].includes(order.status)) {
      throw new BadRequestException(
        'สามารถออกตั๋วเฉพาะออเดอร์ที่ยืนยันแล้วเท่านั้น',
      );
    }
  }
}
