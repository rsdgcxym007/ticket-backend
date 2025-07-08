import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../../order/order.entity';
import { User } from '../../user/user.entity';
import { Seat } from '../../seats/seat.entity';
import { SeatBooking } from '../../seats/seat-booking.entity';
import { ConcurrencyService } from './concurrency.service';
import { DuplicateOrderPreventionService } from './duplicate-order-prevention.service';
import { ThailandTimeHelper } from '../utils/thailand-time.helper';
import { OrderStatus, SeatStatus, BookingStatus, TicketType } from '../enums';
import { OrderUpdatesGateway } from '../gateways/order-updates.gateway';

/**
 * 🚀 Enhanced Order Service with Concurrency Control
 * บริการออเดอร์ที่มีการจัดการ concurrency และป้องกันออเดอร์ซ้ำกัน
 */
@Injectable()
export class EnhancedOrderService {
  private readonly logger = new Logger(EnhancedOrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
    @InjectRepository(SeatBooking)
    private readonly seatBookingRepo: Repository<SeatBooking>,
    private readonly concurrencyService: ConcurrencyService,
    private readonly duplicatePreventionService: DuplicateOrderPreventionService,
    private readonly dataSource: DataSource,
    private readonly orderUpdatesGateway: OrderUpdatesGateway, // ✅ เพิ่ม WebSocket Gateway
  ) {}

  /**
   * 🎫 Create order with full concurrency control
   * สร้างออเดอร์พร้อมการจัดการ concurrency ที่สมบูรณ์
   */
  async createOrderWithConcurrencyControl(
    userId: string,
    orderData: any,
  ): Promise<any> {
    let lockKey: string | null = null;
    let seatLocks: string[] = [];

    try {
      this.logger.log(
        `🎫 Creating order with concurrency control for user: ${userId}`,
      );

      // 1. Validate user exists
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // 2. Prevent duplicate orders
      const duplicateCheck =
        await this.duplicatePreventionService.preventDuplicateOrder(
          userId,
          orderData,
        );
      lockKey = duplicateCheck.lockKey;

      // 3. Lock seats if required
      if (orderData.seatIds && orderData.seatIds.length > 0) {
        const seatLockResult = await this.concurrencyService.lockSeatsForOrder(
          orderData.seatIds,
          orderData.showDate,
          5, // 5 minutes lock
        );
        seatLocks = seatLockResult.lockedSeats;
      }

      // 3.5. Calculate total amount if not provided
      const calculatedTotal = await this.calculateOrderTotal(orderData);

      // 4. Create order atomically
      const order = await this.concurrencyService.atomicCreateOrderWithSeats(
        {
          ...orderData,
          userId,
          orderNumber: this.generateOrderNumber(),
          status: OrderStatus.PENDING,
          total: calculatedTotal.total,
          totalAmount: calculatedTotal.totalAmount,
          createdAt: ThailandTimeHelper.now(),
          updatedAt: ThailandTimeHelper.now(),
          expiresAt: this.calculateExpiryTime(orderData),
        },
        orderData.seatIds || [],
        orderData.showDate,
      );

      // 5. Release duplicate prevention lock
      await this.duplicatePreventionService.releaseDuplicateOrderLock(lockKey);

      // 6. ✅ Send real-time notification to frontend
      this.orderUpdatesGateway.notifyOrderCreated({
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        showDate: orderData.showDate,
        seatIds: orderData.seatIds || [],
        status: order.status,
        message: 'Order created successfully with concurrency protection',
      });

      // 7. ✅ Update seat availability for other users
      if (orderData.seatIds && orderData.seatIds.length > 0) {
        this.orderUpdatesGateway.notifySeatAvailabilityChanged({
          seatIds: orderData.seatIds,
          showDate: orderData.showDate,
          status: 'LOCKED',
          message: 'Seats are now locked for this order',
        });
      }

      this.logger.log(`✅ Successfully created order: ${order.id}`);
      return order;
    } catch (error) {
      this.logger.error(`❌ Failed to create order: ${error.message}`);

      // Cleanup on error
      if (lockKey) {
        await this.duplicatePreventionService.releaseDuplicateOrderLock(
          lockKey,
        );
      }
      if (seatLocks.length > 0) {
        await this.concurrencyService.releaseSeatLocks(seatLocks);
      }

      throw error;
    }
  }

  /**
   * 🔄 Update order with concurrency control
   * อัปเดตออเดอร์พร้อมการจัดการ concurrency
   */
  async updateOrderWithConcurrencyControl(
    orderId: string,
    userId: string,
    updateData: any,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`🔄 Updating order ${orderId} with concurrency control`);

      // 1. Lock order for update
      const order = await queryRunner.query(
        `SELECT * FROM "order" WHERE id = $1 FOR UPDATE`,
        [orderId],
      );

      if (!order || order.length === 0) {
        throw new BadRequestException('Order not found');
      }

      // 2. Validate update permissions
      const currentOrder = order[0];
      if (currentOrder.userId !== userId) {
        throw new BadRequestException('You can only update your own orders');
      }

      if (currentOrder.status === OrderStatus.CONFIRMED) {
        throw new BadRequestException('Cannot update confirmed orders');
      }

      // 3. Handle seat changes if needed
      if (updateData.seatIds && updateData.seatIds.length > 0) {
        await this.handleSeatChanges(
          queryRunner,
          orderId,
          updateData.seatIds,
          updateData.showDate,
        );
      }

      // 4. Update order
      await queryRunner.query(
        `UPDATE "order" 
         SET ${Object.keys(updateData)
           .map((key, index) => `"${key}" = $${index + 2}`)
           .join(', ')}, 
             "updatedAt" = $1 
         WHERE id = $${Object.keys(updateData).length + 2}`,
        [ThailandTimeHelper.now(), ...Object.values(updateData), orderId],
      );

      await queryRunner.commitTransaction();
      this.logger.log(`✅ Successfully updated order: ${orderId}`);

      // Return updated order
      return await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['seatBookings', 'seatBookings.seat'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Failed to update order: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ❌ Cancel order with concurrency control
   * ยกเลิกออเดอร์พร้อมการจัดการ concurrency
   */
  async cancelOrderWithConcurrencyControl(
    orderId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(
        `❌ Cancelling order ${orderId} with concurrency control`,
      );

      // 1. Lock order for update
      const order = await queryRunner.query(
        `SELECT * FROM "order" WHERE id = $1 FOR UPDATE`,
        [orderId],
      );

      if (!order || order.length === 0) {
        throw new BadRequestException('Order not found');
      }

      const currentOrder = order[0];
      if (currentOrder.userId !== userId) {
        throw new BadRequestException('You can only cancel your own orders');
      }

      if (currentOrder.status === OrderStatus.CONFIRMED) {
        throw new BadRequestException('Cannot cancel confirmed orders');
      }

      // 2. Cancel order
      await queryRunner.query(
        `UPDATE "order" 
         SET status = $1, "updatedAt" = $2 
         WHERE id = $3`,
        [OrderStatus.CANCELLED, ThailandTimeHelper.now(), orderId],
      );

      // 3. Cancel seat bookings
      await queryRunner.query(
        `UPDATE seat_booking 
         SET status = $1, "updatedAt" = $2 
         WHERE "orderId" = $3`,
        [BookingStatus.CANCELLED, ThailandTimeHelper.now(), orderId],
      );

      // 4. Release seats
      const seatBookings = await queryRunner.query(
        `SELECT "seatId" FROM seat_booking WHERE "orderId" = $1`,
        [orderId],
      );

      if (seatBookings.length > 0) {
        const seatIds = seatBookings.map((b: any) => b.seatId);
        await queryRunner.query(
          `UPDATE seat 
           SET status = $1, "isLockedUntil" = NULL, "updatedAt" = $2 
           WHERE id = ANY($3)`,
          [SeatStatus.AVAILABLE, ThailandTimeHelper.now(), seatIds],
        );
      }

      await queryRunner.commitTransaction();

      // 5. ✅ Send real-time notification to frontend
      this.orderUpdatesGateway.notifyOrderCancelled({
        orderId: orderId,
        orderNumber: currentOrder.orderNumber,
        userId: currentOrder.userId,
        showDate: currentOrder.showDate,
        message: 'Order cancelled successfully with concurrency protection',
      });

      // 6. ✅ Update seat availability for other users
      if (seatBookings.length > 0) {
        const seatIds = seatBookings.map((b: any) => b.seatId);
        this.orderUpdatesGateway.notifySeatAvailabilityChanged({
          seatIds: seatIds,
          showDate: currentOrder.showDate,
          status: 'AVAILABLE',
          message: 'Seats are now available again',
        });
      }

      this.logger.log(`✅ Successfully cancelled order: ${orderId}`);

      return { success: true, message: 'Order cancelled successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Failed to cancel order: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 🎯 Handle seat changes with concurrency control
   * จัดการการเปลี่ยนที่นั่งพร้อมการจัดการ concurrency
   */
  private async handleSeatChanges(
    queryRunner: any,
    orderId: string,
    newSeatIds: string[],
    showDate: string,
  ): Promise<void> {
    // 1. Get current seat bookings
    const currentBookings = await queryRunner.query(
      `SELECT "seatId" FROM seat_booking WHERE "orderId" = $1`,
      [orderId],
    );

    const currentSeatIds = currentBookings.map((b: any) => b.seatId);

    // 2. Find seats to remove and add
    const seatsToRemove = currentSeatIds.filter(
      (seatId: string) => !newSeatIds.includes(seatId),
    );
    const seatsToAdd = newSeatIds.filter(
      (seatId: string) => !currentSeatIds.includes(seatId),
    );

    // 3. Lock new seats
    if (seatsToAdd.length > 0) {
      const lockedSeats = await queryRunner.query(
        `SELECT id FROM seat WHERE id = ANY($1) AND status = $2 FOR UPDATE`,
        [seatsToAdd, SeatStatus.AVAILABLE],
      );

      if (lockedSeats.length !== seatsToAdd.length) {
        throw new BadRequestException('Some seats are not available');
      }

      // Check for conflicting bookings
      const conflicts = await queryRunner.query(
        `SELECT "seatId" FROM seat_booking 
         WHERE "seatId" = ANY($1) AND "showDate" = $2 AND status IN ($3, $4, $5)`,
        [
          seatsToAdd,
          showDate,
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.PAID,
        ],
      );

      if (conflicts.length > 0) {
        throw new BadRequestException('Some seats are already booked');
      }
    }

    // 4. Remove old seat bookings
    if (seatsToRemove.length > 0) {
      await queryRunner.query(
        `DELETE FROM seat_booking WHERE "orderId" = $1 AND "seatId" = ANY($2)`,
        [orderId, seatsToRemove],
      );

      await queryRunner.query(
        `UPDATE seat SET status = $1, "updatedAt" = $2 WHERE id = ANY($3)`,
        [SeatStatus.AVAILABLE, ThailandTimeHelper.now(), seatsToRemove],
      );
    }

    // 5. Add new seat bookings
    if (seatsToAdd.length > 0) {
      const bookings = seatsToAdd.map((seatId: string) => ({
        orderId,
        seatId,
        showDate,
        status: BookingStatus.PENDING,
        createdAt: ThailandTimeHelper.now(),
        updatedAt: ThailandTimeHelper.now(),
      }));

      await queryRunner.query(
        `INSERT INTO seat_booking (id, "orderId", "seatId", "showDate", status, "createdAt", "updatedAt") 
         VALUES ${bookings.map(() => '(gen_random_uuid(), $1, $2, $3, $4, $5, $6)').join(', ')}`,
        bookings.flatMap((b) => [
          b.orderId,
          b.seatId,
          b.showDate,
          b.status,
          b.createdAt,
          b.updatedAt,
        ]),
      );

      await queryRunner.query(
        `UPDATE seat SET status = $1, "updatedAt" = $2 WHERE id = ANY($3)`,
        [SeatStatus.BOOKED, ThailandTimeHelper.now(), seatsToAdd],
      );
    }
  }

  /**
   * 🔢 Generate unique order number
   * สร้างเลขออเดอร์ที่ไม่ซ้ำกัน
   */
  private generateOrderNumber(): string {
    const now = ThailandTimeHelper.now();
    const timestamp = now.getTime().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `ORD${timestamp}${random}`;
  }

  /**
   * ⏰ Calculate order expiry time
   * คำนวณเวลาหมดอายุของออเดอร์
   */
  private calculateExpiryTime(orderData: any): Date {
    const now = ThailandTimeHelper.now();

    // Standing tickets expire at 9 PM on show date
    if (orderData.ticketType === 'STANDING') {
      const showDate = new Date(orderData.showDate);
      showDate.setHours(21, 0, 0, 0); // 9 PM
      return showDate;
    }

    // Regular tickets expire in 5 minutes
    return new Date(now.getTime() + 5 * 60 * 1000);
  }

  /**
   * 💰 Calculate order total amount
   * คำนวณจำนวนเงินรวมของออเดอร์
   */
  private async calculateOrderTotal(orderData: any): Promise<{
    total: number;
    totalAmount: number;
  }> {
    // If total is already provided, use it
    if (orderData.total || orderData.totalAmount) {
      const total = orderData.total || orderData.totalAmount;
      return {
        total,
        totalAmount: total,
      };
    } // Calculate based on ticket type and quantity
    let basePrice = 0;

    switch (orderData.ticketType) {
      case TicketType.RINGSIDE:
        basePrice = 1800;
        break;
      case TicketType.STADIUM:
        basePrice = 1800;
        break;
      case TicketType.STANDING:
        basePrice = 1500;
        break;
      default:
        basePrice = 1200;
    }

    // Calculate total based on seats or standing tickets
    let totalAmount = 0;

    if (orderData.seatIds && orderData.seatIds.length > 0) {
      // Seat-based pricing
      totalAmount = basePrice * orderData.seatIds.length;
    } else {
      // Standing ticket pricing
      const adultQty = orderData.standingAdultQty || 0;
      const childQty = orderData.standingChildQty || 0;
      const quantity = orderData.quantity || 1;

      totalAmount = basePrice * (adultQty + childQty + quantity);
    }

    return {
      total: totalAmount,
      totalAmount,
    };
  }

  /**
   * 📊 Get system health and concurrency statistics
   * ได้สถิติสุขภาพระบบและการจัดการ concurrency
   */
  async getSystemHealth(): Promise<any> {
    const [
      concurrencyStats,
      duplicatePreventionStats,
      activeOrders,
      lockedSeats,
    ] = await Promise.all([
      this.concurrencyService.getConcurrencyStats(),
      this.duplicatePreventionService.getDuplicatePreventionStats(),
      this.orderRepo.count({ where: { status: OrderStatus.PENDING } }),
      this.seatRepo.count({ where: { status: SeatStatus.RESERVED } }),
    ]);

    return {
      concurrency: concurrencyStats,
      duplicatePrevention: duplicatePreventionStats,
      activeOrders,
      lockedSeats,
      timestamp: ThailandTimeHelper.now(),
    };
  }
}
