import { BadRequestException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Order } from '../order.entity';
import { SeatBooking } from '../../seats/seat-booking.entity';
import { Seat } from '../../seats/seat.entity';
import { User } from '../../user/user.entity';
import { Referrer } from '../../referrer/referrer.entity';
import { OrderStatus, UserRole, BookingStatus } from '../../common/enums';
import { ThailandTimeHelper } from '../../common/utils';
import { OrderValidationHelper } from './order-validation.helper';
import { OrderDataHelper } from './order-data.helper';
import { SeatBookingService } from '../../common/services/seat-booking.service';
import { AuditHelperService } from '../../common/services/audit-helper.service';
import { AuditAction } from '../../common/enums';

export interface SeatChangeResult {
  success: boolean;
  message: string;
  updatedOrder?: any;
}

export class OrderSeatManagementHelper {
  private static readonly logger = new Logger(OrderSeatManagementHelper.name);

  /**
   * เปลี่ยนที่นั่งสำหรับ order ประเภท PENDING/BOOKED
   */
  static async changePendingBookedSeats(
    order: Order,
    newSeatIds: string[],
    userId: string,
    user: User,
    orderRepo: Repository<Order>,
    seatBookingRepo: Repository<SeatBooking>,
    seatRepo: Repository<Seat>,
    referrerRepo: Repository<Referrer>,
    seatBookingService: SeatBookingService,
    auditHelperService: AuditHelperService,
    findByIdMethod: (id: string) => Promise<any>,
    newReferrerCode?: string,
    newCustomerName?: string,
    newCustomerPhone?: string,
    newCustomerEmail?: string,
    newShowDate?: string,
  ): Promise<SeatChangeResult> {
    this.logger.log(`🔄 Changing seats for PENDING/BOOKED order ${order.id}`);

    const oldSeatIds = order.seatBookings?.map((b) => b.seat.id) || [];
    // const oldSeatCount = oldSeatIds.length;
    const newSeatCount = newSeatIds.length;

    // Determine the show date to use for validation
    const showDateToUse = newShowDate
      ? newShowDate
      : ThailandTimeHelper.formatDateTime(order.showDate, 'YYYY-MM-DDTHH:mm');

    // Validate new seat availability (excluding current order)
    await OrderValidationHelper.validateSeatAvailabilityExcludingOrder(
      newSeatIds,
      showDateToUse,
      order.id,
      seatRepo,
      seatBookingRepo,
    );

    // Handle referrer changes
    let newReferrer = order.referrer;
    if (newReferrerCode && newReferrerCode !== order.referrerCode) {
      if (newReferrerCode === 'REMOVE') {
        newReferrer = null;
      } else {
        const referrer = await referrerRepo.findOne({
          where: { code: newReferrerCode, isActive: true },
        });
        if (!referrer) {
          throw new BadRequestException(
            `ไม่พบรหัสผู้แนะนำ: ${newReferrerCode}`,
          );
        }
        newReferrer = referrer;
      }
    }

    // Calculate new pricing
    const newPricing = OrderDataHelper.calculateSeatPricing(
      order.ticketType,
      newSeatCount,
    );
    const newCommission = newReferrer ? newPricing.commission : 0;

    // Update order details
    const orderUpdates: any = {
      quantity: newSeatCount,
      totalAmount: newPricing.totalAmount,
      total: newPricing.totalAmount,
      referrer: newReferrer,
      referrerId: newReferrer?.id || null,
      referrerCode: newReferrer?.code || null,
      referrerCommission: newCommission,
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    };

    // Update customer info if provided
    if (newCustomerName && newCustomerName !== order.customerName) {
      orderUpdates.customerName = newCustomerName;
    }
    if (newCustomerPhone && newCustomerPhone !== order.customerPhone) {
      orderUpdates.customerPhone = newCustomerPhone;
    }
    if (newCustomerEmail && newCustomerEmail !== order.customerEmail) {
      orderUpdates.customerEmail = newCustomerEmail;
    }

    if (
      newShowDate &&
      !ThailandTimeHelper.isSameDay(newShowDate, order.showDate)
    ) {
      orderUpdates.showDate = ThailandTimeHelper.toThailandTime(newShowDate);
    }

    // Remove old seat bookings
    if (order.seatBookings?.length > 0) {
      await seatBookingRepo.delete({ orderId: order.id });
    }

    // Create new seat bookings
    await seatBookingService.createSeatBookings(
      order,
      newSeatIds,
      showDateToUse,
    );

    // Update order
    await orderRepo.update(order.id, orderUpdates);

    // Create audit log
    await auditHelperService.auditOrderAction(
      AuditAction.UPDATE,
      order.id,
      userId,
      auditHelperService.createSeatChangeMetadata(
        order.id,
        oldSeatIds,
        newSeatIds,
        'Seats changed (PENDING/BOOKED)',
      ),
    );

    const updatedOrder = await findByIdMethod(order.id);

    return {
      success: true,
      message: `อัพเดทข้อมูลเสร็จสิ้น`,
      updatedOrder,
    };
  }

  /**
   * เปลี่ยนที่นั่งสำหรับ order ประเภท PAID
   */
  static async changePaidSeats(
    order: Order,
    newSeatIds: string[],
    userId: string,
    user: User,
    currentSeatCount: number,
    newSeatCount: number,
    orderRepo: Repository<Order>,
    seatBookingRepo: Repository<SeatBooking>,
    seatRepo: Repository<Seat>,
    auditHelperService: AuditHelperService,
    findByIdMethod: (id: string) => Promise<any>,
    newShowDate?: string,
  ): Promise<SeatChangeResult> {
    this.logger.log(`🔄 Changing seats for PAID order ${order.id}`);

    // Validate seat count (cannot exceed paid seats)
    if (newSeatCount > currentSeatCount) {
      throw new BadRequestException(
        `Cannot increase seat count for paid order. Current: ${currentSeatCount}, Requested: ${newSeatCount}`,
      );
    }

    const oldSeatIds = order.seatBookings?.map((b) => b.seat.id) || [];

    // Determine the show date to use for validation
    const showDateToUse = newShowDate
      ? newShowDate
      : ThailandTimeHelper.toISOString(order.showDate);

    // Validate new seat availability (excluding current order)
    await OrderValidationHelper.validateSeatAvailabilityExcludingOrder(
      newSeatIds,
      showDateToUse,
      order.id,
      seatRepo,
      seatBookingRepo,
    );

    // Remove old seat bookings
    if (order.seatBookings?.length > 0) {
      await seatBookingRepo.delete({ orderId: order.id });
    }

    // Create new seat bookings with PAID status
    const seats = await seatRepo.findByIds(newSeatIds);
    const newBookings = seats.map((seat) => ({
      order,
      orderId: order.id,
      seat,
      showDate: showDateToUse,
      status: BookingStatus.PAID, // Keep PAID status
      createdAt: ThailandTimeHelper.now(),
      updatedAt: ThailandTimeHelper.now(),
    }));

    await seatBookingRepo.save(newBookings);

    // Update order if seat count or show date changed
    const orderUpdates: any = {};
    let hasUpdates = false;

    if (newSeatCount !== currentSeatCount) {
      orderUpdates.quantity = newSeatCount;
      hasUpdates = true;
    }

    if (
      newShowDate &&
      !ThailandTimeHelper.isSameDay(newShowDate, order.showDate)
    ) {
      orderUpdates.showDate = ThailandTimeHelper.toThailandTime(newShowDate);
      hasUpdates = true;
    }

    if (hasUpdates) {
      orderUpdates.updatedAt = ThailandTimeHelper.now();
      orderUpdates.updatedBy = userId;
      await orderRepo.update(order.id, orderUpdates);
    }

    // Create audit log
    await auditHelperService.auditOrderAction(
      AuditAction.UPDATE,
      order.id,
      userId,
      auditHelperService.createSeatChangeMetadata(
        order.id,
        oldSeatIds,
        newSeatIds,
        'Seats changed (PAID) - pricing unchanged',
      ),
    );

    const updatedOrder = await findByIdMethod(order.id);

    let message = `Seats changed successfully for paid order.`;
    if (newSeatCount < currentSeatCount) {
      message += ` Reduced from ${currentSeatCount} to ${newSeatCount} seats.`;
    } else {
      message += ` ${newSeatCount} seats maintained.`;
    }

    return {
      success: true,
      message,
      updatedOrder,
    };
  }

  /**
   * ตรวจสอบว่าสามารถเปลี่ยนที่นั่งได้หรือไม่
   */
  static validateSeatChangePermissions(user: User, order: Order): void {
    // For development testing, allow all users to change seats
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // Only staff and admin can change seats
    if (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN) {
      throw new BadRequestException(
        'เฉพาะเจ้าหน้าที่เท่านั้นที่สามารถเปลี่ยนที่นั่งได้',
      );
    }

    // Validate order status
    const allowedStatuses = [
      OrderStatus.PENDING,
      OrderStatus.BOOKED,
      OrderStatus.PAID,
      OrderStatus.PARTIAL_ORDER, // เพิ่ม PARTIAL_ORDER เพื่อให้สามารถแก้ไขได้
    ];

    OrderValidationHelper.validateOrderStatusForChanges(order, allowedStatuses);

    // ไม่ validate ticket type ที่นี่ เพราะอาจจะแค่อัพเดทข้อมูลอื่นๆ โดยไม่เปลี่ยนที่นั่ง
    // จะ validate ใน logic ที่จัดการ seat changes จริงๆ แทน
  }
}
