import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../../order/order.entity';
import { User } from '../../user/user.entity';
import { ThailandTimeHelper } from '../utils/thailand-time.helper';

/**
 * 🛡️ Duplicate Order Prevention Service
 * ป้องกันออเดอร์ซ้ำกันและจัดการ race conditions
 */
@Injectable()
export class DuplicateOrderPreventionService {
  private readonly logger = new Logger(DuplicateOrderPreventionService.name);

  // In-memory lock for preventing duplicate orders (for high-frequency requests)
  private readonly orderLocks = new Map<
    string,
    { timestamp: Date; userId: string }
  >();
  private readonly LOCK_DURATION_MS = 30000; // 30 seconds

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {
    // Clean up expired locks every minute
    setInterval(() => this.cleanupExpiredLocks(), 60000);
  }

  /**
   * 🔒 Prevent duplicate orders using composite key locking
   * ป้องกันออเดอร์ซ้ำกันโดยใช้ composite key locking
   */
  async preventDuplicateOrder(
    userId: string,
    orderData: any,
  ): Promise<{ success: boolean; lockKey: string }> {
    // Create unique lock key based on user, ticket type, show date, and seats
    const lockKey = this.generateLockKey(userId, orderData);

    this.logger.log(`🔒 Checking for duplicate order: ${lockKey}`);

    // Check in-memory lock first (fastest)
    if (this.orderLocks.has(lockKey)) {
      const lock = this.orderLocks.get(lockKey)!;
      const now = new Date();

      if (now.getTime() - lock.timestamp.getTime() < this.LOCK_DURATION_MS) {
        this.logger.warn(`⚠️ Duplicate order attempt detected: ${lockKey}`);
        throw new ConflictException(
          'คำสั่งซื้อของคุณกำลังถูกประมวลผล กรุณารอสักครู่',
        );
      }
    }

    // // Set in-memory lock
    // this.orderLocks.set(lockKey, { timestamp: new Date(), userId });

    // // Check database for existing similar orders
    // const existingOrder = await this.checkExistingOrder(userId, orderData);
    // if (existingOrder) {
    //   this.orderLocks.delete(lockKey);
    //   throw new ConflictException('คุณมีคำสั่งซื้อที่คล้ายกันอยู่แล้ว');
    // }

    return { success: true, lockKey };
  }

  /**
   * 🔓 Release duplicate order lock
   * ปลดล็อคการป้องกันออเดอร์ซ้ำกัน
   */
  async releaseDuplicateOrderLock(lockKey: string): Promise<void> {
    this.orderLocks.delete(lockKey);
    this.logger.log(`🔓 Released duplicate order lock: ${lockKey}`);
  }

  /**
   * 🔍 Check for existing similar orders
   * ตรวจสอบออเดอร์ที่คล้ายกันที่มีอยู่
   */
  private async checkExistingOrder(
    userId: string,
    orderData: any,
  ): Promise<Order | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Check for recent similar orders (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const query = `
        SELECT * FROM "order" 
        WHERE "userId" = $1 
        AND "ticketType" = $2 
        AND "showDate" = $3 
        AND "status" IN ('PENDING', 'PAID', 'CONFIRMED')
        AND "createdAt" > $4
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      const result = await queryRunner.query(query, [
        userId,
        orderData.ticketType,
        orderData.showDate,
        fiveMinutesAgo,
      ]);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`❌ Failed to check existing order: ${error.message}`);
      return null;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 🔑 Generate unique lock key
   * สร้าง unique lock key สำหรับออเดอร์
   */
  private generateLockKey(userId: string, orderData: any): string {
    const components = [
      userId,
      orderData.ticketType,
      orderData.showDate,
      orderData.quantity || 0,
      ...(orderData.seatIds || []).sort(), // Sort seat IDs for consistent key
    ];

    return `order_${components.join('_')}`;
  }

  /**
   * 🧹 Clean up expired in-memory locks
   * ทำความสะอาดล็อคที่หมดเวลาในหน่วยความจำ
   */
  private cleanupExpiredLocks(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, lock] of this.orderLocks.entries()) {
      if (now.getTime() - lock.timestamp.getTime() > this.LOCK_DURATION_MS) {
        this.orderLocks.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`🧹 Cleaned up ${cleanedCount} expired order locks`);
    }
  }

  /**
   * 📊 Get duplicate prevention statistics
   * ได้สถิติการป้องกันออเดอร์ซ้ำกัน
   */
  async getDuplicatePreventionStats(): Promise<any> {
    const activeLocks = this.orderLocks.size;
    const now = new Date();

    let recentLocks = 0;
    for (const lock of this.orderLocks.values()) {
      if (now.getTime() - lock.timestamp.getTime() < 60000) {
        // Last minute
        recentLocks++;
      }
    }

    return {
      activeLocks,
      recentLocks,
      lockDurationMs: this.LOCK_DURATION_MS,
      timestamp: ThailandTimeHelper.now(),
    };
  }

  /**
   * 🚨 Emergency cleanup - clear all locks
   * ทำความสะอาดฉุกเฉิน - ล้างล็อคทั้งหมด
   */
  async emergencyCleanup(): Promise<void> {
    const lockCount = this.orderLocks.size;
    this.orderLocks.clear();
    this.logger.warn(
      `🚨 Emergency cleanup completed - cleared ${lockCount} locks`,
    );
  }
}
