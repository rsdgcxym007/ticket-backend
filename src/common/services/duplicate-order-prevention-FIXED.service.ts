import {
  Injectable,
  Logger,
  ConflictException,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../../order/order.entity';
import { User } from '../../user/user.entity';
import { ThailandTimeHelper } from '../utils/thailand-time.helper';

/**
 * 🛡️ Duplicate Order Prevention Service - MEMORY LEAK FIXED
 * ป้องกันออเดอร์ซ้ำกันและจัดการ race conditions
 * ✅ Fixed: Added proper cleanup and memory limits
 */
@Injectable()
export class DuplicateOrderPreventionService implements OnModuleDestroy {
  private readonly logger = new Logger(DuplicateOrderPreventionService.name);

  private readonly orderLocks = new Map<
    string,
    { timestamp: Date; userId: string }
  >();
  private readonly LOCK_DURATION_MS = 30000; // 30 seconds
  private readonly MAX_LOCKS = 500; // 🔥 MEMORY LIMIT
  private cleanupInterval: NodeJS.Timeout; // 🔥 TRACK INTERVAL

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {
    // 🔥 FIXED: Store interval reference for cleanup
    this.cleanupInterval = setInterval(() => this.cleanupExpiredLocks(), 60000);
  }

  async preventDuplicateOrder(
    userId: string,
    orderData: any,
  ): Promise<{ success: boolean; lockKey: string }> {
    // 🔥 MEMORY PROTECTION: Clear old locks if too many
    if (this.orderLocks.size > this.MAX_LOCKS) {
      this.logger.warn(
        `🚨 Order locks map too large (${this.orderLocks.size}), force cleanup`,
      );
      this.cleanupExpiredLocks();

      // If still too large, clear everything
      if (this.orderLocks.size > this.MAX_LOCKS) {
        this.orderLocks.clear();
        this.logger.warn('🚨 Force cleared all order locks');
      }
    }

    const lockKey = this.generateLockKey(userId, orderData);
    this.logger.log(`🔒 Checking for duplicate order: ${lockKey}`);

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

    return { success: true, lockKey };
  }

  async releaseDuplicateOrderLock(lockKey: string): Promise<void> {
    this.orderLocks.delete(lockKey);
    this.logger.log(`🔓 Released duplicate order lock: ${lockKey}`);
  }

  // 🔥 FIXED: Proper cleanup on module destroy
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('🧹 Cleared cleanup interval');
    }
    this.orderLocks.clear();
    this.logger.log('🧹 Cleared order locks map');
  }

  private async checkExistingOrder(
    userId: string,
    orderData: any,
  ): Promise<Order | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
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

  private generateLockKey(userId: string, orderData: any): string {
    const components = [
      userId,
      orderData.ticketType,
      orderData.showDate,
      orderData.quantity || 0,
      ...(orderData.seatIds || []).sort(),
    ];

    return `order_${components.join('_')}`;
  }

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

    // 🔥 EXTRA PROTECTION: Log map size
    this.logger.debug(`📊 Order locks map size: ${this.orderLocks.size}`);
  }

  async getDuplicatePreventionStats(): Promise<any> {
    const activeLocks = this.orderLocks.size;
    const now = new Date();

    let recentLocks = 0;
    for (const lock of this.orderLocks.values()) {
      if (now.getTime() - lock.timestamp.getTime() < 60000) {
        recentLocks++;
      }
    }

    return {
      activeLocks,
      recentLocks,
      maxLocks: this.MAX_LOCKS, // 🔥 ADDED
      lockDurationMs: this.LOCK_DURATION_MS,
      timestamp: ThailandTimeHelper.now(),
    };
  }

  async emergencyCleanup(): Promise<void> {
    const lockCount = this.orderLocks.size;
    this.orderLocks.clear();
    this.logger.warn(
      `🚨 Emergency cleanup completed - cleared ${lockCount} locks`,
    );
  }
}
