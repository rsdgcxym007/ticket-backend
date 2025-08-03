// ========================================
// 📝 AUDIT HELPER SERVICE
// ========================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entities
import { AuditLog } from '../../audit/audit-log.entity';
import { User } from '../../user/user.entity';

// Enums
import { AuditAction } from '../enums';

// Utils
import { ThailandTimeHelper } from '../utils/thailand-time.helper';

@Injectable()
export class AuditHelperService {
  private readonly logger = new Logger(AuditHelperService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 📝 สร้าง Audit Log
   */
  async createAuditLog(
    action: AuditAction,
    entityType: string,
    entityId: string,
    userId: string,
    metadata?: any,
  ): Promise<void> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException('ไม่พบผู้ใช้');
      }

      const auditLog = this.auditRepo.create({
        action,
        entityType,
        entityId,
        userId,
        userRole: user.role,
        metadata,
        timestamp: ThailandTimeHelper.now(),
      } as AuditLog);

      await this.auditRepo.save(auditLog);

      this.logger.log(
        `✅ Audit log created: ${action} on ${entityType} ${entityId} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to create audit log: ${error.message}`,
        error.stack,
      );
      // ไม่ throw error เพื่อไม่ให้ audit log ที่ล้มเหลวทำให้การทำงานหลักหยุด
    }
  }

  /**
   * 📊 Audit Log สำหรับ Order Actions
   */
  async auditOrderAction(
    action: AuditAction,
    orderId: string,
    userId: string,
    metadata?: any,
  ): Promise<void> {
    await this.createAuditLog(action, 'Order', orderId, userId, metadata);
  }

  /**
   * 💳 Audit Log สำหรับ Payment Actions
   */
  async auditPaymentAction(
    action: AuditAction,
    paymentId: string,
    userId: string,
    metadata?: any,
  ): Promise<void> {
    await this.createAuditLog(action, 'Payment', paymentId, userId, metadata);
  }

  /**
   * 👤 Audit Log สำหรับ User Actions
   */
  async auditUserAction(
    action: AuditAction,
    targetUserId: string,
    performingUserId: string,
    metadata?: any,
  ): Promise<void> {
    await this.createAuditLog(
      action,
      'User',
      targetUserId,
      performingUserId,
      metadata,
    );
  }

  /**
   * 🪑 Audit Log สำหรับ Seat Actions
   */
  async auditSeatAction(
    action: AuditAction,
    seatId: string,
    userId: string,
    metadata?: any,
  ): Promise<void> {
    await this.createAuditLog(action, 'Seat', seatId, userId, metadata);
  }

  /**
   * 📊 สร้าง metadata สำหรับ Order Update
   */
  createOrderUpdateMetadata(
    oldData: any,
    newData: any,
    additionalInfo?: any,
  ): any {
    return {
      action: 'Order Updated',
      oldData: this.sanitizeMetadata(oldData),
      newData: this.sanitizeMetadata(newData),
      ...additionalInfo,
    };
  }

  /**
   * 🎫 สร้าง metadata สำหรับ Seat Change
   */
  createSeatChangeMetadata(
    orderId: string,
    oldSeats: string[],
    newSeats: string[],
    reason?: string,
  ): any {
    return {
      action: 'Seats Changed',
      orderId,
      oldSeats,
      newSeats,
      oldSeatCount: oldSeats.length,
      newSeatCount: newSeats.length,
      reason,
    };
  }

  /**
   * ✅ สร้าง metadata สำหรับ Payment Confirmation
   */
  createPaymentConfirmationMetadata(
    orderId: string,
    amount: number,
    method: string,
  ): any {
    return {
      action: 'Payment Confirmed',
      orderId,
      amount,
      paymentMethod: method,
    };
  }

  /**
   * ❌ สร้าง metadata สำหรับ Order Cancellation
   */
  createOrderCancellationMetadata(
    orderId: string,
    reason: string,
    refundAmount?: number,
  ): any {
    return {
      action: 'Order Cancelled',
      orderId,
      reason,
      refundAmount,
    };
  }

  /**
   * 🧹 ล้างข้อมูล metadata ที่ไม่ต้องการ
   */
  private sanitizeMetadata(data: any): any {
    if (!data || typeof data !== 'object') return data;

    // ลบฟิลด์ที่มีข้อมูลละเอียดเกินไปหรือไม่ปลอดภัย
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.apiKey;

    return sanitized;
  }
}
