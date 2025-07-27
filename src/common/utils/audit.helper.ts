import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditLog } from '../../audit/audit-log.entity';
import { AuditAction, UserRole } from '../enums';
import { LoggingHelper } from './logging.helper';

export interface AuditContext {
  userId: string;
  userRole?: UserRole;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditData {
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  context: AuditContext;
}

/**
 * 📋 AuditHelper - ตัวช่วยสำหรับ Audit Logging
 *
 * ฟีเจอร์:
 * - บันทึก audit logs สำหรับทุก action ในระบบ
 * - Support การ track การเปลี่ยนแปลงข้อมูล (oldData vs newData)
 * - เก็บ context ของผู้ใช้งาน (IP, User Agent, etc.)
 * - Integration กับ LoggingHelper
 * - Transaction safety
 */
@Injectable()
export class AuditHelper {
  private static auditRepo: Repository<AuditLog>;

  /**
   * ตั้งค่า repository (เรียกใน module)
   */
  static setRepository(auditRepo: Repository<AuditLog>) {
    AuditHelper.auditRepo = auditRepo;
  }

  /**
   * 📝 บันทึก audit log
   */
  static async log(data: AuditData): Promise<void> {
    if (!AuditHelper.auditRepo) {
      const logger = LoggingHelper.createContextLogger('AuditHelper');
      logger.error('Audit repository not initialized');
      return;
    }

    try {
      const auditLog = AuditHelper.auditRepo.create({
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.context.userId,
        userRole: data.context.userRole || UserRole.USER,
        oldData: data.oldData ? JSON.stringify(data.oldData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        metadata: data.context.metadata
          ? JSON.stringify(data.context.metadata)
          : null,
        ipAddress: data.context.ipAddress,
        userAgent: data.context.userAgent,
        timestamp: new Date(),
      });

      await AuditHelper.auditRepo.save(auditLog);

      const logger = LoggingHelper.createContextLogger('AuditHelper');
      LoggingHelper.logBusinessEvent(logger, 'Audit log created', {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.context.userId,
      });
    } catch (error) {
      const logger = LoggingHelper.createContextLogger('AuditHelper');
      logger.error(`Failed to create audit log: ${error.message}`, error.stack);
    }
  }

  /**
   * 📝 บันทึก CREATE action
   */
  static async logCreate(
    entityType: string,
    entityId: string,
    newData: Record<string, any>,
    context: AuditContext,
  ): Promise<void> {
    await AuditHelper.log({
      action: AuditAction.CREATE,
      entityType,
      entityId,
      newData,
      context,
    });
  }

  /**
   * 📝 บันทึก UPDATE action
   */
  static async logUpdate(
    entityType: string,
    entityId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    context: AuditContext,
  ): Promise<void> {
    await AuditHelper.log({
      action: AuditAction.UPDATE,
      entityType,
      entityId,
      oldData,
      newData,
      context,
    });
  }

  /**
   * 📝 บันทึก DELETE action
   */
  static async logDelete(
    entityType: string,
    entityId: string,
    oldData: Record<string, any>,
    context: AuditContext,
  ): Promise<void> {
    await AuditHelper.log({
      action: AuditAction.DELETE,
      entityType,
      entityId,
      oldData,
      context,
    });
  }

  /**
   * 📝 บันทึก VIEW action (สำหรับข้อมูลสำคัญ)
   */
  static async logView(
    entityType: string,
    entityId: string,
    context: AuditContext,
  ): Promise<void> {
    await AuditHelper.log({
      action: AuditAction.VIEW,
      entityType,
      entityId,
      context,
    });
  }

  /**
   * 📝 บันทึก CANCEL action
   */
  static async logCancel(
    entityType: string,
    entityId: string,
    reason: string,
    context: AuditContext,
  ): Promise<void> {
    await AuditHelper.log({
      action: AuditAction.CANCEL,
      entityType,
      entityId,
      context: {
        ...context,
        metadata: { ...context.metadata, reason },
      },
    });
  }

  /**
   * 📝 บันทึก CONFIRM action
   */
  static async logConfirm(
    entityType: string,
    entityId: string,
    context: AuditContext,
  ): Promise<void> {
    await AuditHelper.log({
      action: AuditAction.CONFIRM,
      entityType,
      entityId,
      context,
    });
  }

  /**
   * 📝 บันทึก REFUND action
   */
  static async logRefund(
    entityType: string,
    entityId: string,
    amount: number,
    reason: string,
    context: AuditContext,
  ): Promise<void> {
    await AuditHelper.log({
      action: AuditAction.REFUND,
      entityType,
      entityId,
      context: {
        ...context,
        metadata: { ...context.metadata, amount, reason },
      },
    });
  }

  /**
   * 🔍 ดึง audit logs ของ entity
   */
  static async getEntityAuditLogs(
    entityType: string,
    entityId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    if (!AuditHelper.auditRepo) {
      throw new InternalServerErrorException(
        'ระบบ Audit repository ยังไม่ถูกตั้งค่า',
      );
    }

    return AuditHelper.auditRepo.find({
      where: {
        entityType,
        entityId,
      },
      order: {
        timestamp: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * 🔍 ดึง audit logs ของ user
   */
  static async getUserAuditLogs(
    userId: string,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    if (!AuditHelper.auditRepo) {
      throw new InternalServerErrorException(
        'ระบบ Audit repository ยังไม่ถูกตั้งค่า',
      );
    }

    return AuditHelper.auditRepo.find({
      where: {
        userId,
      },
      order: {
        timestamp: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * 📊 สร้าง audit context จาก request
   */
  static createContextFromRequest(
    req: any,
    userId: string,
    userRole?: UserRole,
  ): AuditContext {
    return {
      userId,
      userRole,
      ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown',
      metadata: {
        method: req?.method,
        url: req?.url,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 📊 สร้าง audit context สำหรับ system action
   */
  static createSystemContext(metadata?: Record<string, any>): AuditContext {
    return {
      userId: 'SYSTEM',
      userRole: UserRole.SYSTEM,
      metadata: {
        ...metadata,
        source: 'system',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
