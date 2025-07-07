import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../order/order.entity';
import { Seat } from '../../seats/seat.entity';
import { SeatBooking } from '../../seats/seat-booking.entity';
import { ConcurrencyService } from './concurrency.service';
import { DuplicateOrderPreventionService } from './duplicate-order-prevention.service';
import { ThailandTimeHelper } from '../utils/thailand-time.helper';
import { OrderStatus, SeatStatus, BookingStatus } from '../enums';

/**
 * 🧹 Concurrency Cleanup Service
 * บริการทำความสะอาดและจัดการ concurrency
 */
@Injectable()
export class ConcurrencyCleanupService {
  private readonly logger = new Logger(ConcurrencyCleanupService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
    @InjectRepository(SeatBooking)
    private readonly seatBookingRepo: Repository<SeatBooking>,
    private readonly concurrencyService: ConcurrencyService,
    private readonly duplicatePreventionService: DuplicateOrderPreventionService,
  ) {}

  /**
   * 🕐 Cleanup expired seat locks every minute
   * ทำความสะอาดการล็อคที่นั่งที่หมดอายุทุกนาที
   */
  @Cron('0 * * * * *') // Every minute
  async cleanupExpiredSeatLocks(): Promise<void> {
    try {
      this.logger.log('🧹 Starting expired seat locks cleanup');
      await this.concurrencyService.cleanupExpiredSeatLocks();
    } catch (error) {
      this.logger.error(
        `❌ Failed to cleanup expired seat locks: ${error.message}`,
      );
    }
  }

  /**
   * 🕐 Cleanup expired orders every 5 minutes
   * ทำความสะอาดออเดอร์ที่หมดอายุทุก 5 นาที
   */
  @Cron('0 */5 * * * *') // Every 5 minutes
  async cleanupExpiredOrders(): Promise<void> {
    try {
      this.logger.log('🧹 Starting expired orders cleanup');

      const now = ThailandTimeHelper.now();
      const expiredOrders = await this.orderRepo.find({
        where: {
          status: OrderStatus.PENDING,
          expiresAt: { $lt: now } as any,
        },
        relations: ['seatBookings'],
      });

      let processedCount = 0;
      for (const order of expiredOrders) {
        try {
          await this.expireOrder(order);
          processedCount++;
        } catch (error) {
          this.logger.error(
            `❌ Failed to expire order ${order.id}: ${error.message}`,
          );
        }
      }

      if (processedCount > 0) {
        this.logger.log(`✅ Expired ${processedCount} orders`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to cleanup expired orders: ${error.message}`,
      );
    }
  }

  /**
   * 🕐 System health check every 10 minutes
   * ตรวจสอบสุขภาพระบบทุก 10 นาที
   */
  @Cron('0 */10 * * * *') // Every 10 minutes
  async systemHealthCheck(): Promise<void> {
    try {
      this.logger.log('🏥 Starting system health check');

      const [
        activeOrders,
        lockedSeats,
        pendingBookings,
        orphanedBookings,
        duplicateLocks,
      ] = await Promise.all([
        this.orderRepo.count({ where: { status: OrderStatus.PENDING } }),
        this.seatRepo.count({ where: { status: SeatStatus.RESERVED } }),
        this.seatBookingRepo.count({
          where: { status: BookingStatus.PENDING },
        }),
        this.findOrphanedBookings(),
        this.duplicatePreventionService.getDuplicatePreventionStats(),
      ]);

      const healthStats = {
        activeOrders,
        lockedSeats,
        pendingBookings,
        orphanedBookings: orphanedBookings.length,
        duplicateLocks: duplicateLocks.activeLocks,
        timestamp: ThailandTimeHelper.now(),
      };

      this.logger.log(`📊 System Health: ${JSON.stringify(healthStats)}`);

      // Alert if there are issues
      if (orphanedBookings.length > 0) {
        this.logger.warn(
          `⚠️ Found ${orphanedBookings.length} orphaned bookings`,
        );
        await this.cleanupOrphanedBookings(orphanedBookings);
      }

      if (duplicateLocks.activeLocks > 100) {
        this.logger.warn(
          `⚠️ High number of duplicate locks: ${duplicateLocks.activeLocks}`,
        );
      }
    } catch (error) {
      this.logger.error(`❌ System health check failed: ${error.message}`);
    }
  }

  /**
   * 🕐 Deep cleanup every hour
   * ทำความสะอาดลึกทุกชั่วโมง
   */
  @Cron('0 0 * * * *') // Every hour
  async deepCleanup(): Promise<void> {
    try {
      this.logger.log('🧹 Starting deep cleanup');

      // Clean up old expired orders (older than 1 day)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oldExpiredOrders = await this.orderRepo.find({
        where: {
          status: OrderStatus.EXPIRED,
          updatedAt: { $lt: oneDayAgo } as any,
        },
        relations: ['seatBookings'],
      });

      for (const order of oldExpiredOrders) {
        await this.cleanupOldOrder(order);
      }

      // Clean up old seat locks
      const oldLockedSeats = await this.seatRepo.find({
        where: {
          status: SeatStatus.RESERVED,
          isLockedUntil: { $lt: oneDayAgo } as any,
        },
      });

      if (oldLockedSeats.length > 0) {
        await this.seatRepo.update(
          { id: { $in: oldLockedSeats.map((s) => s.id) } as any },
          {
            status: SeatStatus.AVAILABLE,
            isLockedUntil: null,
            updatedAt: ThailandTimeHelper.now(),
          },
        );
      }

      this.logger.log(
        `✅ Deep cleanup completed - cleaned ${oldExpiredOrders.length} old orders and ${oldLockedSeats.length} old seat locks`,
      );
    } catch (error) {
      this.logger.error(`❌ Deep cleanup failed: ${error.message}`);
    }
  }

  /**
   * 🚫 Expire individual order
   * หมดอายุออเดอร์แต่ละรายการ
   */
  private async expireOrder(order: Order): Promise<void> {
    try {
      // Update order status
      await this.orderRepo.update(order.id, {
        status: OrderStatus.EXPIRED,
        updatedAt: ThailandTimeHelper.now(),
      });

      // Update seat bookings
      if (order.seatBookings && order.seatBookings.length > 0) {
        const seatIds = order.seatBookings.map((booking) => booking.seat.id);

        await this.seatBookingRepo.update(
          { orderId: order.id },
          {
            status: BookingStatus.EXPIRED,
            updatedAt: ThailandTimeHelper.now(),
          },
        );

        // Release seats
        await this.seatRepo.update(
          { id: { $in: seatIds } as any },
          {
            status: SeatStatus.AVAILABLE,
            isLockedUntil: null,
            updatedAt: ThailandTimeHelper.now(),
          },
        );
      }

      this.logger.log(`⏰ Expired order: ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to expire order ${order.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🔍 Find orphaned bookings
   * หาการจองที่นั่งที่ไม่มีออเดอร์
   */
  private async findOrphanedBookings(): Promise<SeatBooking[]> {
    return await this.seatBookingRepo
      .createQueryBuilder('booking')
      .leftJoin('booking.order', 'order')
      .where('order.id IS NULL')
      .getMany();
  }

  /**
   * 🧹 Cleanup orphaned bookings
   * ทำความสะอาดการจองที่นั่งที่ไม่มีออเดอร์
   */
  private async cleanupOrphanedBookings(
    orphanedBookings: SeatBooking[],
  ): Promise<void> {
    try {
      const seatIds = orphanedBookings.map((booking) => booking.seat.id);

      // Delete orphaned bookings
      await this.seatBookingRepo.remove(orphanedBookings);

      // Release seats
      await this.seatRepo.update(
        { id: { $in: seatIds } as any },
        {
          status: SeatStatus.AVAILABLE,
          isLockedUntil: null,
          updatedAt: ThailandTimeHelper.now(),
        },
      );

      this.logger.log(
        `🧹 Cleaned up ${orphanedBookings.length} orphaned bookings`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to cleanup orphaned bookings: ${error.message}`,
      );
    }
  }

  /**
   * 🗑️ Cleanup old order
   * ทำความสะอาดออเดอร์เก่า
   */
  private async cleanupOldOrder(order: Order): Promise<void> {
    try {
      // Delete old seat bookings
      if (order.seatBookings && order.seatBookings.length > 0) {
        await this.seatBookingRepo.remove(order.seatBookings);
      }

      // Keep the order record but mark it as cleaned
      await this.orderRepo.update(order.id, {
        updatedAt: ThailandTimeHelper.now(),
      });

      this.logger.log(`🗑️ Cleaned up old order: ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to cleanup old order ${order.id}: ${error.message}`,
      );
    }
  }

  /**
   * 📊 Get cleanup statistics
   * ได้สถิติการทำความสะอาด
   */
  async getCleanupStats(): Promise<any> {
    try {
      const [
        totalOrders,
        pendingOrders,
        expiredOrders,
        lockedSeats,
        pendingBookings,
        expiredBookings,
      ] = await Promise.all([
        this.orderRepo.count(),
        this.orderRepo.count({ where: { status: OrderStatus.PENDING } }),
        this.orderRepo.count({ where: { status: OrderStatus.EXPIRED } }),
        this.seatRepo.count({ where: { status: SeatStatus.RESERVED } }),
        this.seatBookingRepo.count({
          where: { status: BookingStatus.PENDING },
        }),
        this.seatBookingRepo.count({
          where: { status: BookingStatus.EXPIRED },
        }),
      ]);

      return {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          expired: expiredOrders,
        },
        seats: {
          locked: lockedSeats,
        },
        bookings: {
          pending: pendingBookings,
          expired: expiredBookings,
        },
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get cleanup stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🚨 Manual emergency cleanup
   * ทำความสะอาดฉุกเฉิน
   */
  async emergencyCleanup(): Promise<void> {
    try {
      this.logger.warn('🚨 Starting emergency cleanup');

      // Clean up all expired locks
      await this.concurrencyService.cleanupExpiredSeatLocks();

      // Clean up duplicate prevention locks
      await this.duplicatePreventionService.emergencyCleanup();

      // Force cleanup of all stuck orders
      await this.cleanupExpiredOrders();

      this.logger.warn('🚨 Emergency cleanup completed');
    } catch (error) {
      this.logger.error(`❌ Emergency cleanup failed: ${error.message}`);
      throw error;
    }
  }
}
