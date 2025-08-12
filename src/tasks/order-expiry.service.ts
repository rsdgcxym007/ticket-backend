import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual, Between, Raw } from 'typeorm';
import { Order } from '../order/order.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { OrderStatus, BookingStatus } from '../common/enums';
import { DateTimeHelper } from '../common/utils';
import { AttendanceStatus } from '../common/enums';

@Injectable()
export class OrderExpiryService {
  private readonly logger = new Logger(OrderExpiryService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(SeatBooking)
    private seatBookingRepo: Repository<SeatBooking>,
  ) {}

  /**
   * ⏰ ตรวจสอบและยกเลิกออเดอร์ที่หมดเวลาทุก 5 นาที (ลดจาก 1 นาที)
   */
  @Cron('0 */5 * * * *') // Every 5 minutes instead of every minute
  async handleExpiredOrders() {
    try {
      const now = DateTimeHelper.now();

      // หาออเดอร์ที่หมดเวลาแล้ว
      const expiredOrders = await this.orderRepo.find({
        where: {
          status: OrderStatus.PENDING,
          expiresAt: LessThan(now),
        },
        relations: ['seatBookings', 'seatBookings.seat'],
      });

      if (expiredOrders.length === 0) {
        this.logger.debug('🔍 ไม่พบออเดอร์ที่หมดเวลา');
        return;
      }

      this.logger.log(`⏰ พบออเดอร์หมดเวลา ${expiredOrders.length} รายการ`);

      for (const order of expiredOrders) {
        await this.expireOrder(order);
      }

      this.logger.log(
        `✅ ยกเลิกออเดอร์หมดเวลาเรียบร้อย ${expiredOrders.length} รายการ`,
      );
    } catch (error) {
      this.logger.error('❌ เกิดข้อผิดพลาดในการยกเลิกออเดอร์หมดเวลา:', error);
    }
  }

  /**
   * 🎭 ตรวจสอบและอัปเดตสถานะ AttendanceStatus ทุกวันเที่ยงคืน
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateAttendanceStatus() {
    try {
      this.logger.log('🎭 เริ่มตรวจสอบและอัปเดตสถานะ AttendanceStatus...');

      const todayString = DateTimeHelper.formatDate(
        DateTimeHelper.now(),
        'YYYY-MM-DD',
      );

      const pendingAttendanceOrders = await this.orderRepo.find({
        where: {
          showDate: Raw((alias) => `${alias} = :todayString`, { todayString }),
          attendanceStatus: AttendanceStatus.PENDING,
        },
      });

      if (pendingAttendanceOrders.length === 0) {
        this.logger.debug('🔍 ไม่พบออเดอร์ที่ต้องอัปเดตสถานะ AttendanceStatus');
        return;
      }

      // อัปเดตสถานะ AttendanceStatus เป็น NO_SHOW
      const orderIds = pendingAttendanceOrders.map((order) => order.id);
      await this.orderRepo.update(orderIds, {
        attendanceStatus: AttendanceStatus.NO_SHOW,
        updatedAt: DateTimeHelper.now(),
      });

      this.logger.log(
        `✅ อัปเดตสถานะ AttendanceStatus เป็น NO_SHOW สำหรับ ${orderIds.length} ออเดอร์`,
      );
    } catch (error) {
      this.logger.error(
        '❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ AttendanceStatus:',
        error,
      );
    }
  }

  /**
   * 🚫 ยกเลิกออเดอร์และปลดล็อคที่นั่ง
   */
  private async expireOrder(order: Order): Promise<void> {
    try {
      this.logger.log(`🚫 กำลังยกเลิกออเดอร์: ${order.id}`);

      // อัปเดตสถานะออเดอร์
      await this.orderRepo.update(order.id, {
        status: OrderStatus.EXPIRED,
        updatedAt: DateTimeHelper.now(),
      });

      // ยกเลิกการจองที่นั่ง
      if (order.seatBookings && order.seatBookings.length > 0) {
        const bookingIds = order.seatBookings.map((booking) => booking.id);

        await this.seatBookingRepo.update(bookingIds, {
          status: BookingStatus.EXPIRED,
          updatedAt: DateTimeHelper.now(),
        });

        this.logger.log(
          `💺 ปลดล็อคที่นั่ง ${order.seatBookings.length} ที่นั่ง`,
        );
      }

      // TODO: ส่งการแจ้งเตือน
      // await this.notificationService.sendOrderExpiredNotification(order);

      this.logger.log(`✅ ยกเลิกออเดอร์ ${order.id} เรียบร้อย`);
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการยกเลิกออเดอร์ ${order.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 🧹 ทำความสะอาดข้อมูลเก่าทุกวันเที่ยงคืน
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldData() {
    try {
      this.logger.log('🧹 เริ่มทำความสะอาดข้อมูลเก่า...');

      const thirtyDaysAgo = DateTimeHelper.addDays(DateTimeHelper.now(), -30);

      // ลบออเดอร์ที่ยกเลิกหรือหมดเวลาที่เก่ากว่า 30 วัน
      const deletedOrders = await this.orderRepo.delete({
        status: OrderStatus.EXPIRED,
        updatedAt: LessThan(thirtyDaysAgo),
      });

      // ลบการจองที่หมดเวลาที่เก่ากว่า 30 วัน
      const deletedBookings = await this.seatBookingRepo.delete({
        status: BookingStatus.EXPIRED,
        updatedAt: LessThan(thirtyDaysAgo),
      });

      this.logger.log(
        `🗑️ ลบข้อมูลเก่า - ออเดอร์: ${deletedOrders.affected} การจอง: ${deletedBookings.affected}`,
      );
    } catch (error) {
      this.logger.error('❌ เกิดข้อผิดพลาดในการทำความสะอาดข้อมูล:', error);
    }
  }

  /**
   * 📊 สร้างรายงานออเดอร์หมดเวลาทุกวันเที่ยงคืน
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateExpiryReport() {
    try {
      this.logger.log('📊 สร้างรายงานออเดอร์หมดเวลา...');

      const today = DateTimeHelper.startOfDay(DateTimeHelper.now());
      const tomorrow = DateTimeHelper.addDays(today, 1);

      // นับออเดอร์ที่หมดเวลาวันนี้
      const expiredTodayCount = await this.orderRepo.count({
        where: {
          status: OrderStatus.EXPIRED,
          updatedAt: LessThan(tomorrow),
          expiresAt: LessThan(today),
        },
      });

      // นับออเดอร์ที่รอดำเนินการ
      const pendingCount = await this.orderRepo.count({
        where: {
          status: OrderStatus.PENDING,
        },
      });

      this.logger.log(
        `📈 รายงานวันนี้ - หมดเวลา: ${expiredTodayCount} รอดำเนินการ: ${pendingCount}`,
      );

      // TODO: ส่งรายงานให้ Admin
      // await this.notificationService.sendDailyExpiryReport({
      //   expiredToday: expiredTodayCount,
      //   pending: pendingCount,
      //   date: DateTimeHelper.formatDate(today),
      // });
    } catch (error) {
      this.logger.error('❌ เกิดข้อผิดพลาดในการสร้างรายงาน:', error);
    }
  }

  /**
   * ⚠️ แจ้งเตือนออเดอร์ที่ใกล้หมดเวลาทุก 5 นาที (ลดจาก 30 วินาที)
   */
  @Cron('0 */3 * * * *') // Every 5 minutes instead of every 30 seconds
  async notifyExpiringOrders() {
    try {
      const now = DateTimeHelper.now();
      const warningTime = DateTimeHelper.addMinutes(now, 2); // 2 นาทีก่อนหมดเวลา

      const expiringOrders = await this.orderRepo.find({
        where: {
          status: OrderStatus.PENDING,
          expiresAt: LessThan(warningTime),
        },
        relations: ['user'],
      });

      for (const order of expiringOrders) {
        const minutesLeft = DateTimeHelper.timeUntilExpiry(order.expiresAt);

        if (minutesLeft <= 2 && minutesLeft > 0) {
          this.logger.warn(
            `⏳ ออเดอร์ ${order.id} จะหมดเวลาใน ${minutesLeft} นาที`,
          );

          // TODO: ส่งการแจ้งเตือน
          // await this.notificationService.sendExpiryWarning(order, minutesLeft);
        }
      }
    } catch (error) {
      this.logger.error('❌ เกิดข้อผิดพลาดในการแจ้งเตือน:', error);
    }
  }

  /**
   * 🔧 ตรวจสอบสุขภาพระบบทุก 30 นาที (ลดจาก 5 นาที)
   */
  @Cron('0 */30 * * * *') // Every 30 minutes instead of every 5 minutes
  async healthCheck() {
    try {
      // ตรวจสอบออเดอร์ที่ค้างอยู่นานเกินไป
      const stuckOrdersCount = await this.orderRepo.count({
        where: {
          status: OrderStatus.PENDING,
          createdAt: LessThan(
            DateTimeHelper.addHours(DateTimeHelper.now(), -1),
          ),
        },
      });

      if (stuckOrdersCount > 0) {
        this.logger.warn(
          `⚠️ พบออเดอร์ที่ค้างอยู่มากกว่า 1 ชั่วโมง: ${stuckOrdersCount} รายการ`,
        );
      }

      // ตรวจสอบการจองที่นั่งที่ผิดปกติ
      const orphanedBookingsCount = await this.seatBookingRepo
        .createQueryBuilder('booking')
        .leftJoin('booking.order', 'order')
        .where('order.id IS NULL')
        .getCount();

      if (orphanedBookingsCount > 0) {
        this.logger.warn(
          `⚠️ พบการจองที่นั่งที่ไม่มีออเดอร์: ${orphanedBookingsCount} รายการ`,
        );
      }
    } catch (error) {
      this.logger.error('❌ เกิดข้อผิดพลาดในการตรวจสอบสุขภาพระบบ:', error);
    }
  }

  /**
   * 📈 รายงานสถิติการหมดเวลาทุกชั่วโมง
   */
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyStats() {
    try {
      const oneHourAgo = DateTimeHelper.addHours(DateTimeHelper.now(), -1);

      const stats = await this.orderRepo
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('order.updatedAt >= :oneHourAgo', { oneHourAgo })
        .groupBy('order.status')
        .getRawMany();

      const statsMap = stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {});

      this.logger.log(`📊 สถิติชั่วโมงที่แล้ว: ${JSON.stringify(statsMap)}`);
    } catch (error) {
      this.logger.error('❌ เกิดข้อผิดพลาดในการสร้างสถิติ:', error);
    }
  }
}
