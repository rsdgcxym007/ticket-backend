import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/order/order.entity';
import { SeatBooking } from 'src/seats/seat-booking.entity';
import { Seat } from 'src/seats/seat.entity';
import { Repository, DataSource } from 'typeorm';
import { SeatStatus, BookingStatus, OrderStatus } from '../enums';
import { ThailandTimeHelper } from '../utils';

/**
 * 🔐 Concurrency Control Service
 * ป้องกันออเดอร์ซ้ำกันและจัดการ race conditions
 */
@Injectable()
export class ConcurrencyService {
  private readonly logger = new Logger(ConcurrencyService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
    @InjectRepository(SeatBooking)
    private readonly seatBookingRepo: Repository<SeatBooking>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 🔒 Lock seats for order creation with database-level locking
   * ล็อคที่นั่งระหว่างการสร้างออเดอร์ด้วย database-level locking
   */
  async lockSeatsForOrder(
    seatIds: string[],
    showDate: string,
    lockDurationMinutes: number = 5,
  ): Promise<{ success: boolean; lockedSeats: string[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`🔒 Attempting to lock seats: ${seatIds.join(', ')}`);

      // 1. Lock seats with FOR UPDATE to prevent concurrent access
      const lockQuery = `
        SELECT id, status, "isLockedUntil" 
        FROM seat 
        WHERE id = ANY($1) 
        FOR UPDATE NOWAIT
      `;

      let lockedSeats;
      try {
        lockedSeats = await queryRunner.query(lockQuery, [seatIds]);
      } catch (error) {
        this.logger.warn(
          `⚠️ Failed to acquire lock on seats: ${error.message}`,
        );
        throw new BadRequestException(
          'ที่นั่งกำลังถูกจองโดยผู้อื่น กรุณาลองใหม่อีกครั้ง',
        );
      }

      // 2. Check if seats are available
      const now = ThailandTimeHelper.now();
      const unavailableSeats = lockedSeats.filter(
        (seat: any) =>
          seat.status !== SeatStatus.AVAILABLE ||
          (seat.isLockedUntil && new Date(seat.isLockedUntil) > now),
      );

      if (unavailableSeats.length > 0) {
        this.logger.warn(
          `❌ Seats unavailable: ${unavailableSeats.map((s: any) => s.id).join(', ')}`,
        );
        throw new BadRequestException('ที่นั่งบางที่ไม่สามารถจองได้');
      }

      // 3. Check for existing bookings on the same show date
      const existingBookings = await queryRunner.query(
        `SELECT seat_id 
         FROM seat_booking 
         WHERE seat_id = ANY($1) 
         AND show_date = $2 
         AND status IN ('PENDING', 'CONFIRMED', 'PAID')`,
        [seatIds, showDate],
      );

      if (existingBookings.length > 0) {
        const bookedSeatIds = existingBookings.map((b: any) => b.seat_id);
        this.logger.warn(
          `❌ Seats already booked for this show: ${bookedSeatIds.join(', ')}`,
        );
        throw new BadRequestException(
          `ที่นั่งเหล่านี้ถูกจองไปแล้วในวันแสดงนี้: ${bookedSeatIds.join(', ')}`,
        );
      }

      // 4. Lock seats temporarily
      const lockUntil = new Date(
        now.getTime() + lockDurationMinutes * 60 * 1000,
      );
      await queryRunner.query(
        `UPDATE seat 
         SET status = $1, "isLockedUntil" = $2, "updatedAt" = $3 
         WHERE id = ANY($4)`,
        [SeatStatus.RESERVED, lockUntil, now, seatIds],
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `✅ Successfully locked ${seatIds.length} seats until ${lockUntil.toISOString()}`,
      );
      return { success: true, lockedSeats: seatIds };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Failed to lock seats: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 🔓 Release seat locks
   * ปลดล็อคที่นั่งเมื่อออเดอร์สำเร็จหรือยกเลิก
   */
  async releaseSeatLocks(seatIds: string[]): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`🔓 Releasing locks for seats: ${seatIds.join(', ')}`);

      await queryRunner.query(
        `UPDATE seat 
         SET status = $1, "isLockedUntil" = NULL, "updatedAt" = $2 
         WHERE id = ANY($3) AND status = $4`,
        [
          SeatStatus.AVAILABLE,
          ThailandTimeHelper.now(),
          seatIds,
          SeatStatus.RESERVED,
        ],
      );

      await queryRunner.commitTransaction();
      this.logger.log(`✅ Released locks for ${seatIds.length} seats`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Failed to release seat locks: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 🔄 Atomic order creation with seat booking
   * สร้างออเดอร์และจองที่นั่งแบบ atomic
   */
  async atomicCreateOrderWithSeats(
    orderData: any,
    seatIds: string[],
    showDate: string,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(
        `🔄 Starting atomic order creation with ${seatIds.length} seats`,
      );

      // 1. Create order
      const order = queryRunner.manager.create(Order, orderData);
      const savedOrder = await queryRunner.manager.save(order);

      // 2. Create seat bookings atomically
      if (seatIds && seatIds.length > 0) {
        const bookings = seatIds.map((seatId) => ({
          orderId: savedOrder.id,
          seatId,
          showDate,
          status: BookingStatus.PENDING,
          createdAt: ThailandTimeHelper.now(),
          updatedAt: ThailandTimeHelper.now(),
        }));

        await queryRunner.query(
          `INSERT INTO seat_booking (id, "orderId", "seatId", "showDate", status, "createdAt", "updatedAt") 
           VALUES ${bookings.map(() => '(gen_random_uuid(), ?, ?, ?, ?, ?, ?)').join(', ')}`,
          bookings.flatMap((b) => [
            b.orderId,
            b.seatId,
            b.showDate,
            b.status,
            b.createdAt,
            b.updatedAt,
          ]),
        );

        // 3. Update seat status to BOOKED
        await queryRunner.query(
          `UPDATE seat 
           SET status = $1, "isLockedUntil" = NULL, "updatedAt" = $2 
           WHERE id = ANY($3)`,
          [SeatStatus.BOOKED, ThailandTimeHelper.now(), seatIds],
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `✅ Successfully created order ${savedOrder.id} with atomic seat booking`,
      );

      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Failed atomic order creation: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 🧹 Cleanup expired seat locks
   * ทำความสะอาดการล็อคที่นั่งที่หมดเวลา
   */
  async cleanupExpiredSeatLocks(): Promise<void> {
    try {
      const now = ThailandTimeHelper.now();

      const result = await this.seatRepo
        .createQueryBuilder()
        .update(Seat)
        .set({
          status: SeatStatus.AVAILABLE,
          isLockedUntil: null,
          updatedAt: now,
        })
        .where('status = :status', { status: SeatStatus.RESERVED })
        .andWhere('isLockedUntil < :now', { now })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(`🧹 Cleaned up ${result.affected} expired seat locks`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to cleanup expired seat locks: ${error.message}`,
      );
    }
  }

  /**
   * 📊 Get concurrency statistics
   * ได้สถิติเกี่ยวกับการจัดการ concurrency
   */
  async getConcurrencyStats(): Promise<any> {
    try {
      const [lockedSeats, pendingBookings, activeOrders] = await Promise.all([
        this.seatRepo.count({ where: { status: SeatStatus.RESERVED } }),
        this.seatBookingRepo.count({
          where: { status: BookingStatus.PENDING },
        }),
        this.orderRepo.count({ where: { status: OrderStatus.PAID } }),
      ]);

      return {
        lockedSeats,
        pendingBookings,
        activeOrders,
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get concurrency stats: ${error.message}`);
      throw error;
    }
  }
}
