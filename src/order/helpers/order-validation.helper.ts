import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { Order } from '../order.entity';
import { User } from '../../user/user.entity';
import { Seat } from '../../seats/seat.entity';
import { SeatBooking } from '../../seats/seat-booking.entity';
import { Referrer } from '../../referrer/referrer.entity';
import {
  UserRole,
  OrderStatus,
  BookingStatus,
  TicketType,
} from '../../common/enums';
import { ThailandTimeHelper } from '../../common/utils';

export class OrderValidationHelper {
  /**
   * ตรวจสอบสิทธิ์การเข้าถึง order
   */
  static validateOrderAccess(
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
        throw new ForbiddenException('คุณไม่มีสิทธิ์ลบออเดอร์');
      }
      return;
    }

    throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงออเดอร์นี้');
  }

  /**
   * ตรวจสอบการยืนยันการชำระเงิน
   */
  static validatePaymentConfirmation(user: User, order: Order): void {
    // ตรวจสอบสิทธิ์
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF) {
      throw new ForbiddenException(
        'เฉพาะเจ้าหน้าที่เท่านั้นที่สามารถยืนยันการชำระเงินได้',
      );
    }

    // ตรวจสอบสถานะ order
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.BOOKED
    ) {
      throw new BadRequestException(
        'สามารถยืนยันการชำระเงินได้เฉพาะออเดอร์ที่มีสถานะ PENDING หรือ BOOKED เท่านั้น',
      );
    }
  }

  /**
   * ตรวจสอบการสร้างตั๋ว
   */
  static validateTicketGeneration(user: User, order: Order): void {
    // ตรวจสอบสิทธิ์การเข้าถึง
    this.validateOrderAccess(user, order, 'VIEW');

    // ตรวจสอบสถานะ order
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'สามารถสร้างตั๋วได้เฉพาะออเดอร์ที่ชำระเงินแล้วเท่านั้น',
      );
    }
  }

  /**
   * ตรวจสอบความพร้อมใช้งานของที่นั่ง
   */
  static async validateSeatAvailability(
    seatIds: string[],
    showDate: string,
    seatRepo: Repository<Seat>,
    seatBookingRepo: Repository<SeatBooking>,
  ): Promise<void> {
    if (!seatIds || seatIds.length === 0) {
      return;
    }

    // ตรวจสอบว่าที่นั่งมีอยู่จริง
    const seats = await seatRepo.findByIds(seatIds);
    if (seats.length !== seatIds.length) {
      throw new BadRequestException('ไม่พบที่นั่งบางที่ที่ระบุ');
    }

    // ตรวจสอบว่าที่นั่งถูกจองแล้วหรือไม่
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
      relations: ['seat'],
    });

    if (bookedSeats.length > 0) {
      const bookedSeatNumbers = await Promise.all(
        bookedSeats.map(async (booking) => {
          const seat = await seatRepo.findOne({
            where: { id: booking.seat.id },
          });
          return seat?.seatNumber || booking.seat.id;
        }),
      );

      throw new BadRequestException(
        `ที่นั่งหมายเลข ${bookedSeatNumbers.join(', ')} ถูกจองไปแล้วในวันที่แสดงนี้`,
      );
    }
  }

  /**
   * ตรวจสอบความพร้อมใช้งานของที่นั่ง ยกเว้นออเดอร์ปัจจุบัน
   */
  static async validateSeatAvailabilityExcludingOrder(
    seatIds: string[],
    showDate: string,
    currentOrderId: string,
    seatRepo: Repository<Seat>,
    seatBookingRepo: Repository<SeatBooking>,
  ): Promise<void> {
    const seats = await seatRepo.findByIds(seatIds);

    if (!seats || seats.length !== seatIds.length) {
      throw new BadRequestException('ไม่พบที่นั่งบางที่');
    }

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
      (booking) => booking.order.id !== currentOrderId,
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
   * ตรวจสอบและแปลงหมายเลขที่นั่งเป็น ID
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
   * ตรวจสอบผู้แนะนำ
   */
  static async validateReferrer(
    referrerCode: string | undefined,
    referrerRepo: Repository<Referrer>,
  ): Promise<Referrer | null> {
    if (!referrerCode) {
      return null;
    }

    const referrer = await referrerRepo.findOne({
      where: { code: referrerCode, isActive: true },
    });

    if (!referrer) {
      throw new BadRequestException(`ไม่พบรหัสผู้แนะนำ: ${referrerCode}`);
    }

    return referrer;
  }

  /**
   * ตรวจสอบขีดจำกัดการจอง
   */
  static async validateBookingLimits(
    user: User,
    requestedQuantity: number,
    orderRepo: Repository<Order>,
  ): Promise<void> {
    // Admin และ Staff ไม่มีขีดจำกัด
    if (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) {
      return;
    }

    // ตรวจสอบจำนวนการจองในวันเดียวกัน
    const today = ThailandTimeHelper.format(
      ThailandTimeHelper.now(),
      'YYYY-MM-DD',
    );
    const todayOrders = await orderRepo.count({
      where: {
        userId: user.id,
        showDate: ThailandTimeHelper.toThailandTime(today),
        status: In([
          OrderStatus.PENDING,
          OrderStatus.CONFIRMED,
          OrderStatus.PAID,
        ]),
      },
    });

    const maxOrdersPerDay = 99999; // กำหนดขีดจำกัด
    if (todayOrders >= maxOrdersPerDay) {
      throw new BadRequestException(
        `คุณสามารถจองได้สูงสุด ${maxOrdersPerDay} ออเดอร์ต่อวัน`,
      );
    }

    // ตรวจสอบจำนวนตั๋วต่อการจอง
    const maxTicketsPerOrder = 99999; // กำหนดขีดจำกัด
    if (requestedQuantity > maxTicketsPerOrder) {
      throw new BadRequestException(
        `สามารถจองได้สูงสุด ${maxTicketsPerOrder} ตั๋วต่อออเดอร์`,
      );
    }
  }

  /**
   * ตรวจสอบสถานะ order สำหรับการเปลี่ยนแปลง
   */
  static validateOrderStatusForChanges(
    order: Order,
    allowedStatuses: OrderStatus[],
  ): void {
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        `ไม่สามารถแก้ไขออเดอร์ที่มีสถานะ ${order.status} ได้`,
      );
    }
  }

  /**
   * ตรวจสอบประเภทตั๋วสำหรับการเปลี่ยนที่นั่ง
   */
  static validateTicketTypeForSeatChange(ticketType: TicketType): void {
    if (ticketType === TicketType.STANDING) {
      throw new BadRequestException(
        'ไม่สามารถเปลี่ยนที่นั่งสำหรับตั๋วแบบยืนได้',
      );
    }
  }
}
