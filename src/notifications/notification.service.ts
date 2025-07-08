import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationChannel,
} from './notification.entity';
import { User } from '../user/user.entity';
import { ThailandTimeHelper } from '../common/utils/thailand-time.helper';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * สร้างการแจ้งเตือนใหม่
   */
  async createNotification(data: {
    title: string;
    message: string;
    type: NotificationType;
    channel: NotificationChannel;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    this.logger.log(`📢 สร้างการแจ้งเตือน: ${data.title}`);

    const notification = this.notificationRepo.create({
      title: data.title,
      message: data.message,
      type: data.type,
      channel: data.channel,
      userId: data.userId,
      metadata: data.metadata,
      status: NotificationStatus.PENDING,
    });

    return await this.notificationRepo.save(notification);
  }

  /**
   * ส่งการแจ้งเตือนเมื่อออเดอร์ได้รับการยืนยัน
   */
  async sendOrderConfirmationNotification(orderId: string, userId: string) {
    await this.createNotification({
      title: '🎫 ออเดอร์ของคุณได้รับการยืนยันแล้ว',
      message: `ออเดอร์ #${orderId} ได้รับการยืนยันเรียบร้อยแล้ว กรุณาชำระเงินภายในเวลาที่กำหนด`,
      type: NotificationType.ORDER_CONFIRMED,
      channel: NotificationChannel.IN_APP,
      userId,
      metadata: { orderId },
    });

    // ส่งผ่าน Push Notification ด้วย
    await this.createNotification({
      title: 'ออเดอร์ยืนยันแล้ว',
      message: `ออเดอร์ #${orderId} พร้อมชำระเงิน`,
      type: NotificationType.ORDER_CONFIRMED,
      channel: NotificationChannel.PUSH,
      userId,
      metadata: { orderId },
    });
  }

  /**
   * ส่งการแจ้งเตือนเมื่อชำระเงินสำเร็จ
   */
  async sendPaymentSuccessNotification(
    orderId: string,
    userId: string,
    amount: number,
  ) {
    await this.createNotification({
      title: '💰 ชำระเงินสำเร็จ',
      message: `ชำระเงินออเดอร์ #${orderId} จำนวน ${amount.toLocaleString()} บาท สำเร็จแล้ว`,
      type: NotificationType.PAYMENT_SUCCESS,
      channel: NotificationChannel.IN_APP,
      userId,
      metadata: { orderId, amount },
    });

    await this.createNotification({
      title: 'ชำระเงินสำเร็จ',
      message: `ออเดอร์ #${orderId} ชำระแล้ว ${amount.toLocaleString()} บาท`,
      type: NotificationType.PAYMENT_SUCCESS,
      channel: NotificationChannel.PUSH,
      userId,
      metadata: { orderId, amount },
    });
  }

  /**
   * ส่งการแจ้งเตือนเมื่อออเดอร์ใกล้หมดอายุ
   */
  async sendOrderExpiringNotification(
    orderId: string,
    userId: string,
    expiresAt: Date,
  ) {
    const timeLeft = Math.floor(
      (expiresAt.getTime() - Date.now()) / (1000 * 60),
    ); // นาที

    await this.createNotification({
      title: '⏰ ออเดอร์ใกล้หมดอายุ',
      message: `ออเดอร์ #${orderId} จะหมดอายุในอีก ${timeLeft} นาที กรุณาชำระเงินด่วน`,
      type: NotificationType.ORDER_EXPIRING,
      channel: NotificationChannel.IN_APP,
      userId,
      metadata: { orderId, expiresAt, timeLeft },
    });

    await this.createNotification({
      title: 'ออเดอร์ใกล้หมดอายุ',
      message: `${timeLeft} นาที เหลือเวลาชำระ`,
      type: NotificationType.ORDER_EXPIRING,
      channel: NotificationChannel.PUSH,
      userId,
      metadata: { orderId, expiresAt, timeLeft },
    });
  }

  /**
   * ส่งการแจ้งเตือนเมื่อชำระเงินล้มเหลว
   */
  async sendPaymentFailedNotification(
    orderId: string,
    userId: string,
    reason?: string,
  ) {
    await this.createNotification({
      title: '❌ การชำระเงินไม่สำเร็จ',
      message: `การชำระเงินออเดอร์ #${orderId} ไม่สำเร็จ ${reason ? `เหตุผล: ${reason}` : ''} กรุณาลองใหม่อีกครั้ง`,
      type: NotificationType.PAYMENT_FAILED,
      channel: NotificationChannel.IN_APP,
      userId,
      metadata: { orderId, reason },
    });
  }

  /**
   * ส่งการแจ้งเตือนโปรโมชั่นให้ผู้ใช้ทั้งหมด
   */
  async sendPromotionalNotification(
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.log(`📣 ส่งการแจ้งเตือนโปรโมชั่น: ${title}`);

    // ส่งให้ผู้ใช้ทั้งหมด
    const users = await this.userRepo.find({ select: ['id'] });

    const notifications = users.map((user) =>
      this.notificationRepo.create({
        title,
        message,
        type: NotificationType.PROMOTIONAL,
        channel: NotificationChannel.IN_APP,
        userId: user.id,
        metadata,
        status: NotificationStatus.PENDING,
      }),
    );

    await this.notificationRepo.save(notifications);
    this.logger.log(`📣 ส่งโปรโมชั่นให้ ${users.length} ผู้ใช้`);
  }

  /**
   * ดึงการแจ้งเตือนของผู้ใช้
   */
  async getUserNotifications(userId: string, limit: number = 50) {
    return await this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * ทำเครื่องหมายว่าอ่านแล้ว
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (notification) {
      notification.status = NotificationStatus.READ;
      notification.readAt = ThailandTimeHelper.now();
      await this.notificationRepo.save(notification);
    }

    return notification;
  }

  /**
   * ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
   */
  async markAllAsRead(userId: string) {
    await this.notificationRepo.update(
      {
        userId,
        status: NotificationStatus.SENT,
      },
      {
        status: NotificationStatus.READ,
        readAt: ThailandTimeHelper.now(),
      },
    );
  }

  /**
   * นับการแจ้งเตือนที่ยังไม่ได้อ่าน
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepo.count({
      where: {
        userId,
        status: NotificationStatus.SENT,
      },
    });
  }

  /**
   * ลบการแจ้งเตือนเก่า (เก่ากว่า 30 วัน)
   */
  async cleanupOldNotifications() {
    const thirtyDaysAgo = ThailandTimeHelper.subtract(
      ThailandTimeHelper.now(),
      30,
      'day',
    );

    const result = await this.notificationRepo.delete({
      createdAt: LessThan(thirtyDaysAgo),
    });

    this.logger.log(`🧹 ลบการแจ้งเตือนเก่า ${result.affected} รายการ`);
  }

  /**
   * สถิติการแจ้งเตือน
   */
  async getNotificationStats() {
    const today = ThailandTimeHelper.startOfDay();
    const thisWeek = ThailandTimeHelper.startOfWeek();
    const thisMonth = ThailandTimeHelper.startOfMonth();

    const [todayCount, weekCount, monthCount, totalCount, unreadCount, byType] =
      await Promise.all([
        this.notificationRepo.count({
          where: { createdAt: MoreThanOrEqual(today) },
        }),
        this.notificationRepo.count({
          where: { createdAt: MoreThanOrEqual(thisWeek) },
        }),
        this.notificationRepo.count({
          where: { createdAt: MoreThanOrEqual(thisMonth) },
        }),
        this.notificationRepo.count(),
        this.notificationRepo.count({
          where: { status: NotificationStatus.SENT },
        }),
        this.getNotificationsByType(),
      ]);

    return {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      total: totalCount,
      unread: unreadCount,
      byType,
      lastUpdated: ThailandTimeHelper.formatDateTime(ThailandTimeHelper.now()),
    };
  }

  private async getNotificationsByType() {
    const results = await this.notificationRepo
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.type')
      .getRawMany();

    return results.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {});
  }
}
