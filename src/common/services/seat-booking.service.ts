// ========================================
// 🪑 SEAT BOOKING SERVICE
// ========================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { SeatBooking } from '../../seats/seat-booking.entity';
import { Seat } from '../../seats/seat.entity';
import { Order } from '../../order/order.entity';

// Enums
import { BookingStatus } from '../enums';

// Utils
import { ThailandTimeHelper } from '../utils/thailand-time.helper';

@Injectable()
export class SeatBookingService {
  private readonly logger = new Logger(SeatBookingService.name);

  constructor(
    @InjectRepository(SeatBooking)
    private readonly seatBookingRepo: Repository<SeatBooking>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
  ) {}

  /**
   * 🪑 สร้าง Seat Bookings สำหรับ Order
   */
  async createSeatBookings(
    order: Order,
    seatIds: string[],
    showDate: string,
    status: BookingStatus = BookingStatus.PENDING,
  ): Promise<SeatBooking[]> {
    this.logger.log(
      `Creating seat bookings for order ${order.id}, seats: ${seatIds.join(', ')}`,
    );

    const seats = await this.seatRepo.findByIds(seatIds);

    const bookings = seats.map((seat) => ({
      order,
      orderId: order.id,
      seat,
      showDate: showDate,
      status,
      createdAt: ThailandTimeHelper.now(),
      updatedAt: ThailandTimeHelper.now(),
    }));

    return await this.seatBookingRepo.save(bookings);
  }

  /**
   * 🔄 อัปเดตสถานะ Seat Bookings ของ Order
   */
  async updateOrderSeatBookingsStatus(
    orderId: string,
    status: BookingStatus,
  ): Promise<void> {
    this.logger.log(
      `Updating seat bookings status for order ${orderId} to ${status}`,
    );

    await this.seatBookingRepo.update(
      { orderId },
      {
        status,
        updatedAt: ThailandTimeHelper.now(),
      },
    );
  }

  /**
   * 🗑️ ลบ Seat Bookings ของ Order
   */
  async deleteOrderSeatBookings(orderId: string): Promise<void> {
    this.logger.log(`Deleting seat bookings for order ${orderId}`);
    await this.seatBookingRepo.delete({ orderId });
  }

  /**
   * 🔄 เปลี่ยน Seat Bookings สำหรับ Order
   */
  async replaceSeatBookings(
    order: Order,
    newSeatIds: string[],
    showDate: string,
    status: BookingStatus = BookingStatus.PENDING,
  ): Promise<SeatBooking[]> {
    this.logger.log(
      `Replacing seat bookings for order ${order.id} with new seats: ${newSeatIds.join(', ')}`,
    );

    // ลบ booking เก่า
    await this.deleteOrderSeatBookings(order.id);

    // สร้าง booking ใหม่
    return await this.createSeatBookings(order, newSeatIds, showDate, status);
  }

  /**
   * 📊 นับจำนวน Seat Bookings ตามสถานะ
   */
  async countSeatBookingsByStatus(
    showDate: string,
    status: BookingStatus,
  ): Promise<number> {
    return await this.seatBookingRepo.count({
      where: {
        showDate,
        status,
      },
    });
  }

  /**
   * 🎫 ดึง Seat Bookings พร้อม relations
   */
  async getSeatBookingsWithDetails(orderId: string): Promise<SeatBooking[]> {
    return await this.seatBookingRepo.find({
      where: { orderId },
      relations: ['seat', 'seat.zone', 'order'],
    });
  }
}
