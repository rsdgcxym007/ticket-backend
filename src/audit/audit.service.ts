import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditAction, UserRole } from '../common/enums';
import { DateTimeHelper } from '../common/utils';

export interface AuditLogData {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  userRole: UserRole;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * 📝 บันทึก audit log
   */
  async log(data: AuditLogData): Promise<AuditLog> {
    try {
      const auditLog = this.auditRepo.create({
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        userRole: data.userRole,
        oldData: data.oldData ? JSON.stringify(data.oldData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: DateTimeHelper.now(),
      });

      const saved = await this.auditRepo.save(auditLog);

      this.logger.log(
        `📝 Audit: ${data.action} ${data.entityType}:${data.entityId} by ${data.userId}`,
      );

      return saved;
    } catch (error) {
      this.logger.error('Failed to save audit log:', error);
      throw error;
    }
  }

  /**
   * 🎫 บันทึกการสร้างออเดอร์
   */
  async logOrderCreated(
    orderId: string,
    orderData: any,
    userId: string,
    userRole: UserRole,
    metadata?: Record<string, any>,
  ): Promise<AuditLog> {
    return this.log({
      action: AuditAction.CREATE,
      entityType: 'Order',
      entityId: orderId,
      userId,
      userRole,
      newData: orderData,
      metadata: {
        ...metadata,
        orderNumber: orderData.orderNumber,
        totalAmount: orderData.totalAmount,
        ticketType: orderData.ticketType,
      },
    });
  }

  /**
   * 💰 บันทึกการชำระเงิน
   */
  async logPaymentProcessed(
    orderId: string,
    paymentData: any,
    userId: string,
    userRole: UserRole,
    metadata?: Record<string, any>,
  ): Promise<AuditLog> {
    return this.log({
      action: AuditAction.UPDATE,
      entityType: 'Payment',
      entityId: orderId,
      userId,
      userRole,
      newData: paymentData,
      metadata: {
        ...metadata,
        paymentMethod: paymentData.method,
        amount: paymentData.amount,
        status: paymentData.status,
      },
    });
  }

  /**
   * 🚫 บันทึกการยกเลิกออเดอร์
   */
  async logOrderCancelled(
    orderId: string,
    oldData: any,
    newData: any,
    userId: string,
    userRole: UserRole,
    reason?: string,
  ): Promise<AuditLog> {
    return this.log({
      action: AuditAction.CANCEL,
      entityType: 'Order',
      entityId: orderId,
      userId,
      userRole,
      oldData,
      newData,
      metadata: {
        reason,
        cancelledAt: DateTimeHelper.now(),
      },
    });
  }

  /**
   * 🔄 บันทึกการเปลี่ยนที่นั่ง
   */
  async logSeatChanged(
    orderId: string,
    oldSeats: string[],
    newSeats: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<AuditLog> {
    return this.log({
      action: AuditAction.UPDATE,
      entityType: 'SeatBooking',
      entityId: orderId,
      userId,
      userRole,
      oldData: { seats: oldSeats },
      newData: { seats: newSeats },
      metadata: {
        changedFrom: oldSeats.join(', '),
        changedTo: newSeats.join(', '),
      },
    });
  }

  /**
   * 💸 บันทึกการคืนเงิน
   */
  async logRefundProcessed(
    orderId: string,
    refundData: any,
    userId: string,
    userRole: UserRole,
    reason?: string,
  ): Promise<AuditLog> {
    return this.log({
      action: AuditAction.REFUND,
      entityType: 'Refund',
      entityId: orderId,
      userId,
      userRole,
      newData: refundData,
      metadata: {
        reason,
        refundAmount: refundData.amount,
        refundMethod: refundData.method,
      },
    });
  }

  /**
   * 📋 ดึงข้อมูล audit logs แบบแบ่งหน้า
   */
  async getAuditLogs(query: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: AuditAction;
    userRole?: UserRole;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ logs: AuditLog[]; total: number; page: number }> {
    const queryBuilder = this.auditRepo.createQueryBuilder('audit');

    if (query.entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', {
        entityType: query.entityType,
      });
    }

    if (query.entityId) {
      queryBuilder.andWhere('audit.entityId = :entityId', {
        entityId: query.entityId,
      });
    }

    if (query.userId) {
      queryBuilder.andWhere('audit.userId = :userId', {
        userId: query.userId,
      });
    }

    if (query.action) {
      queryBuilder.andWhere('audit.action = :action', {
        action: query.action,
      });
    }

    if (query.userRole) {
      queryBuilder.andWhere('audit.userRole = :userRole', {
        userRole: query.userRole,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`audit.${sortBy}`, sortOrder);

    const limit = query.limit || 20;
    const offset = query.offset || 0;
    queryBuilder.take(limit).skip(offset);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return { logs, total, page: Math.floor(offset / limit) + 1 };
  }

  /**
   * 📊 สถิติ audit logs
   */
  async getAuditStats(
    query: {
      startDate?: string;
      endDate?: string;
      groupBy?: string;
      entityType?: string;
      userId?: string;
    },
    timeRange?: string,
  ) {
    this.logger.log(`📊 ดึงสถิติ audit logs`);
    console.log('timeRange', timeRange);

    const queryBuilder = this.auditRepo.createQueryBuilder('audit');

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    if (query.entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', {
        entityType: query.entityType,
      });
    }

    if (query.userId) {
      queryBuilder.andWhere('audit.userId = :userId', {
        userId: query.userId,
      });
    }

    const groupBy = query.groupBy || 'action';

    let selectFields = '';
    let groupByFields = '';

    switch (groupBy) {
      case 'action':
        selectFields = 'audit.action as category, COUNT(*) as count';
        groupByFields = 'audit.action';
        break;
      case 'entityType':
        selectFields = 'audit.entityType as category, COUNT(*) as count';
        groupByFields = 'audit.entityType';
        break;
      case 'userRole':
        selectFields = 'audit.userRole as category, COUNT(*) as count';
        groupByFields = 'audit.userRole';
        break;
      case 'hour':
        selectFields =
          'EXTRACT(hour FROM audit.timestamp) as category, COUNT(*) as count';
        groupByFields = 'EXTRACT(hour FROM audit.timestamp)';
        break;
      case 'day':
        selectFields = 'DATE(audit.timestamp) as category, COUNT(*) as count';
        groupByFields = 'DATE(audit.timestamp)';
        break;
      default:
        selectFields = 'audit.action as category, COUNT(*) as count';
        groupByFields = 'audit.action';
    }

    queryBuilder
      .select(selectFields)
      .groupBy(groupByFields)
      .orderBy('count', 'DESC');

    const stats = await queryBuilder.getRawMany();

    return {
      groupBy,
      stats,
      totalRecords: stats.reduce((sum, stat) => sum + Number(stat.count), 0),
    };
  }

  /**
   * 👤 กิจกรรมของผู้ใช้
   */
  async getUserActivity(query: {
    userId: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    this.logger.log(`👤 ดึงกิจกรรมของผู้ใช้ ${query.userId}`);

    const queryBuilder = this.auditRepo
      .createQueryBuilder('audit')
      .where('audit.userId = :userId', { userId: query.userId });

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    queryBuilder.orderBy('audit.timestamp', 'DESC').take(query.limit || 50);

    const activities = await queryBuilder.getMany();

    // สถิติการใช้งาน
    const actionStats = activities.reduce(
      (acc, activity) => {
        acc[activity.action] = (acc[activity.action] || 0) + 1;
        return acc;
      },
      {} as Record<AuditAction, number>,
    );

    const entityStats = activities.reduce(
      (acc, activity) => {
        acc[activity.entityType] = (acc[activity.entityType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      userId: query.userId,
      totalActivities: activities.length,
      activities,
      actionStats,
      entityStats,
    };
  }

  /**
   * 🔍 ประวัติของ entity
   */
  async getEntityHistory(query: {
    entityType: string;
    entityId: string;
    limit?: number;
  }) {
    this.logger.log(`🔍 ดึงประวัติของ ${query.entityType}:${query.entityId}`);

    const history = await this.auditRepo.find({
      where: {
        entityType: query.entityType,
        entityId: query.entityId,
      },
      order: { timestamp: 'DESC' },
      take: query.limit || 50,
    });

    return {
      entityType: query.entityType,
      entityId: query.entityId,
      totalChanges: history.length,
      history,
    };
  }

  /**
   * 📊 กิจกรรมระบบ
   */
  async getSystemActivity(query: {
    startDate?: string;
    endDate?: string;
    timeInterval?: string;
    action?: AuditAction;
  }) {
    this.logger.log(`📊 ดึงกิจกรรมระบบ`);

    const queryBuilder = this.auditRepo.createQueryBuilder('audit');

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    if (query.action) {
      queryBuilder.andWhere('audit.action = :action', {
        action: query.action,
      });
    }

    const timeInterval = query.timeInterval || 'hour';
    let selectFields = '';
    let groupByFields = '';

    switch (timeInterval) {
      case 'hour':
        selectFields =
          'EXTRACT(hour FROM audit.timestamp) as time_unit, COUNT(*) as count';
        groupByFields = 'EXTRACT(hour FROM audit.timestamp)';
        break;
      case 'day':
        selectFields = 'DATE(audit.timestamp) as time_unit, COUNT(*) as count';
        groupByFields = 'DATE(audit.timestamp)';
        break;
      case 'week':
        selectFields =
          'EXTRACT(week FROM audit.timestamp) as time_unit, COUNT(*) as count';
        groupByFields = 'EXTRACT(week FROM audit.timestamp)';
        break;
      case 'month':
        selectFields =
          'EXTRACT(month FROM audit.timestamp) as time_unit, COUNT(*) as count';
        groupByFields = 'EXTRACT(month FROM audit.timestamp)';
        break;
      default:
        selectFields =
          'EXTRACT(hour FROM audit.timestamp) as time_unit, COUNT(*) as count';
        groupByFields = 'EXTRACT(hour FROM audit.timestamp)';
    }

    queryBuilder
      .select(selectFields)
      .groupBy(groupByFields)
      .orderBy('time_unit', 'ASC');

    const systemActivity = await queryBuilder.getRawMany();

    return {
      timeInterval,
      systemActivity,
      totalActivities: systemActivity.reduce(
        (sum, activity) => sum + Number(activity.count),
        0,
      ),
    };
  }

  /**
   * 🔍 ค้นหา audit logs
   */
  async searchAuditLogs(
    query: {
      searchTerm: string;
      searchField?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
    entityType?: string,
    entityId?: string,
    userId?: string,
  ) {
    this.logger.log(`🔍 ค้นหา audit logs: ${query.searchTerm}`);

    const queryBuilder = this.auditRepo.createQueryBuilder('audit');

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    if (entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', { entityType });
    }

    if (entityId) {
      queryBuilder.andWhere('audit.entityId = :entityId', { entityId });
    }

    if (userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId });
    }

    const searchField = query.searchField || 'all';
    const searchTerm = `%${query.searchTerm}%`;

    switch (searchField) {
      case 'oldData':
        queryBuilder.andWhere('audit.oldData ILIKE :searchTerm', {
          searchTerm,
        });
        break;
      case 'newData':
        queryBuilder.andWhere('audit.newData ILIKE :searchTerm', {
          searchTerm,
        });
        break;
      case 'metadata':
        queryBuilder.andWhere('audit.metadata ILIKE :searchTerm', {
          searchTerm,
        });
        break;
      default:
        queryBuilder.andWhere(
          '(audit.oldData ILIKE :searchTerm OR audit.newData ILIKE :searchTerm OR audit.metadata ILIKE :searchTerm)',
          { searchTerm },
        );
    }

    queryBuilder.orderBy('audit.timestamp', 'DESC').take(query.limit || 20);

    const results = await queryBuilder.getMany();

    return {
      searchTerm: query.searchTerm,
      searchField,
      totalResults: results.length,
      results,
    };
  }

  /**
   * 📋 ข้อมูล audit log ตาม ID
   */
  async getAuditLogById(id: string): Promise<AuditLog> {
    const auditLog = await this.auditRepo.findOne({ where: { id } });

    if (!auditLog) {
      throw new NotFoundException(`ไม่พบข้อมูลบันทึก Audit log รหัส ${id}`);
    }

    return auditLog;
  }

  /**
   * 📈 สถิติแบบเรียลไทม์
   */
  async getRealtimeAuditStats() {
    this.logger.log('📈 ดึงสถิติแบบเรียลไทม์');

    const now = DateTimeHelper.now();
    const today = DateTimeHelper.startOfDay(now);
    const thisHour = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
    );

    const [todayCount, thisHourCount, totalCount, recentActions] =
      await Promise.all([
        this.auditRepo.count({
          where: { timestamp: Between(today, now) },
        }),
        this.auditRepo.count({
          where: { timestamp: Between(thisHour, now) },
        }),
        this.auditRepo.count(),
        this.auditRepo.find({
          order: { timestamp: 'DESC' },
          take: 10,
        }),
      ]);

    return {
      todayCount,
      thisHourCount,
      totalCount,
      recentActions,
      lastUpdated: now,
    };
  }

  /**
   * 📊 รายงานการใช้งานระบบ
   */
  async getUsageReport(query: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    this.logger.log('📊 สร้างรายงานการใช้งานระบบ');

    return await this.getAuditStats(query, 'usage');
  }

  /**
   * 🔒 รายงานการเข้าถึง
   */
  async getAccessReport(query: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    this.logger.log('🔒 สร้างรายงานการเข้าถึง');

    const queryBuilder = this.auditRepo
      .createQueryBuilder('audit')
      .where('audit.action IN (:...actions)', {
        actions: [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE],
      });

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    const accessLogs = await queryBuilder.getMany();

    return {
      totalAccess: accessLogs.length,
      accessLogs: accessLogs.slice(0, 100),
    };
  }

  /**
   * ⚠️ รายงานกิจกรรมที่น่าสงสัย
   */
  async getSuspiciousActivity(query: { startDate?: string; endDate?: string }) {
    this.logger.log('⚠️ ค้นหากิจกรรมที่น่าสงสัย');

    const queryBuilder = this.auditRepo.createQueryBuilder('audit');

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    // ค้นหาผู้ใช้ที่มีกิจกรรมผิดปกติ (มากกว่า 100 actions ใน 1 ชั่วโมง)
    const suspiciousUsers = await queryBuilder
      .select('audit.userId')
      .addSelect('COUNT(*) as action_count')
      .addSelect('EXTRACT(hour FROM audit.timestamp) as hour')
      .groupBy('audit.userId')
      .addGroupBy('EXTRACT(hour FROM audit.timestamp)')
      .having('COUNT(*) > 100')
      .getRawMany();

    // ค้นหาการลบข้อมูลที่ผิดปกติ
    const suspiciousDeletes = await this.auditRepo.find({
      where: {
        action: AuditAction.DELETE,
        timestamp:
          query.startDate && query.endDate
            ? Between(new Date(query.startDate), new Date(query.endDate))
            : undefined,
      },
      order: { timestamp: 'DESC' },
      take: 50,
    });

    return {
      suspiciousUsers,
      suspiciousDeletes,
      totalSuspicious: suspiciousUsers.length + suspiciousDeletes.length,
    };
  }

  /**
   * 📊 ส่งออกรายงาน audit
   */
  async exportAuditReport(query: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    this.logger.log('📊 ส่งออกรายงาน audit');

    const { logs } = await this.getAuditLogs({
      ...query,
      limit: 10000, // Export more records
    });

    // Convert to CSV format (mock implementation)
    const csvData = logs.map((log) => ({
      timestamp: log.timestamp,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      userRole: log.userRole,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
    }));

    return {
      format: 'csv',
      data: csvData,
      totalRecords: logs.length,
      exportedAt: DateTimeHelper.now(),
    };
  }
}
