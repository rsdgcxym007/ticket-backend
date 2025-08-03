import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Get,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EnhancedOrderService } from '../common/services/enhanced-order.service';
import { ConcurrencyService } from '../common/services/concurrency.service';
import { DuplicateOrderPreventionService } from '../common/services/duplicate-order-prevention.service';
import { ConcurrencyCleanupService } from '../common/services/concurrency-cleanup.service';
import { ThailandTimeHelper } from '../common/utils/thailand-time.helper';
import {
  AuditHelper,
  ApiResponseHelper,
  LoggingHelper,
  ErrorHandlingHelper,
} from '../common/utils';
import { AuditAction, UserRole } from '../common/enums';

/**
 * 🛡️ Enhanced Order Controller with Concurrency Control
 * คอนโทรลเลอร์ออเดอร์ที่มีการจัดการ concurrency
 */
@ApiTags('Enhanced Orders')
@Controller('enhanced-orders')
export class EnhancedOrderController {
  private readonly logger = new Logger(EnhancedOrderController.name);

  constructor(
    private readonly enhancedOrderService: EnhancedOrderService,
    private readonly concurrencyService: ConcurrencyService,
    private readonly duplicatePreventionService: DuplicateOrderPreventionService,
    private readonly cleanupService: ConcurrencyCleanupService,
  ) {}

  /**
   * 🎫 Create order with concurrency control
   * สร้างออเดอร์พร้อมการจัดการ concurrency
   */
  @Post()
  @ApiOperation({ summary: 'สร้างออเดอร์พร้อมการจัดการ concurrency' })
  @ApiResponse({ status: 201, description: 'สร้างออเดอร์สำเร็จ' })
  @ApiResponse({
    status: 409,
    description: 'ออเดอร์ซ้ำกันหรือที่นั่งไม่พร้อมใช้งาน',
  })
  @ApiResponse({ status: 429, description: 'คำขอมากเกินไป' })
  async createOrder(@Body() orderData: { userId: string; [key: string]: any }) {
    try {
      // Log performance and business events
      const performanceTimer = LoggingHelper.createPerformanceTimer(
        'EnhancedOrderController.createOrder',
      );

      LoggingHelper.logBusinessEvent(
        this.logger,
        'Starting enhanced order creation',
        { userId: orderData.userId, hasSeats: !!orderData.seatIds },
      );

      this.logger.log(
        `🎫 Enhanced order creation request from user: ${orderData.userId}`,
      );

      // Validation: If purchaseType is ONSITE, skip customer info requirements (use imported enum)
      // const isOnsite = orderData.purchaseType === OrderPurchaseType.ONSITE;

      // if (isOnsite) {
      //   // Remove customer info fields if present and empty
      //   if (!orderData.customerName) delete orderData.customerName;
      //   if (!orderData.customerPhone) delete orderData.customerPhone;
      //   if (!orderData.customerEmail) delete orderData.customerEmail;
      // } else {
      //   // For other purchaseType, require customer info
      //   if (
      //     !orderData.customerName ||
      //     !orderData.customerPhone ||
      //     !orderData.customerEmail
      //   ) {
      //     return ApiResponseHelper.error(
      //       'กรุณากรอกชื่อ เบอร์โทร และอีเมลสำหรับการสร้างออเดอร์',
      //       400,
      //     );
      //   }
      // }

      // เก็บ createdBy ทุกกรณี ไม่ว่า role ไหน
      const orderWithCreatedBy = { ...orderData, createdBy: orderData.userId };

      const order =
        await this.enhancedOrderService.createOrderWithConcurrencyControl(
          orderData.userId,
          orderWithCreatedBy,
        );

      // Log audit event for order creation
      await AuditHelper.logCreate(
        'order',
        order.id,
        {
          order_type: 'enhanced',
          concurrency_control: true,
          seats: orderData.seatIds || [],
          show_date: orderData.showDate,
        },
        AuditHelper.createSystemContext({
          userId: orderData.userId,
          controller: 'EnhancedOrderController',
          action: 'createOrder',
        }),
      );

      // End performance timer
      LoggingHelper.endPerformanceTimer(performanceTimer, this.logger, {
        orderId: order.id,
      });

      return ApiResponseHelper.success(
        order,
        'สร้างออเดอร์สำเร็จ พร้อมการป้องกันการซ้ำกัน',
      );
    } catch (err) {
      this.logger.error(`❌ Enhanced order creation failed: ${err.message}`);

      // Log error event
      LoggingHelper.logError(this.logger, err, {
        userId: orderData.userId,
      });

      // Handle specific error types
      const handledError = ErrorHandlingHelper.handleDatabaseError(err);
      return ApiResponseHelper.error(
        handledError.message,
        handledError.getStatus(),
      );
    }
  }

  /**
   * 🔄 Update order with concurrency control
   * อัปเดตออเดอร์พร้อมการจัดการ concurrency
   */
  @Patch(':id')
  @ApiOperation({ summary: 'อัปเดตออเดอร์พร้อมการจัดการ concurrency' })
  @ApiResponse({ status: 200, description: 'อัปเดตออเดอร์สำเร็จ' })
  @ApiResponse({
    status: 409,
    description: 'ไม่สามารถอัปเดตได้เนื่องจากมีการเปลี่ยนแปลงอื่น',
  })
  async updateOrder(
    @Param('id') id: string,
    @Body() updateData: { userId: string; [key: string]: any },
  ) {
    try {
      const performanceTimer = LoggingHelper.createPerformanceTimer(
        'EnhancedOrderController.updateOrder',
      );

      LoggingHelper.logBusinessEvent(
        this.logger,
        'Starting enhanced order update',
        { orderId: id, userId: updateData.userId },
      );

      this.logger.log(`🔄 Enhanced order update request: ${id}`);

      // Validation: If purchaseType is ONSITE, skip customer info requirements (use imported enum)
      // const isOnsite =
      //   updateData.purchaseType === OrderPurchaseType.ONSITE ||
      //   updateData.purchaseType === 'OrderPurchaseType.ONSITE';

      // if (isOnsite) {
      //   // Remove customer info fields if present and empty
      //   if (!updateData.customerName) delete updateData.customerName;
      //   if (!updateData.customerPhone) delete updateData.customerPhone;
      //   if (!updateData.customerEmail) delete updateData.customerEmail;
      // } else {
      //   // For other purchaseType, require customer info
      //   if (
      //     !updateData.customerName ||
      //     !updateData.customerPhone ||
      //     !updateData.customerEmail
      //   ) {
      //     return ApiResponseHelper.error(
      //       'กรุณากรอกชื่อ เบอร์โทร และอีเมลสำหรับการอัปเดตออเดอร์',
      //       400,
      //     );
      //   }
      // }

      const order =
        await this.enhancedOrderService.updateOrderWithConcurrencyControl(
          id,
          updateData.userId,
          updateData,
        );

      // Log audit event for order update
      await AuditHelper.logUpdate(
        'order',
        id,
        {},
        updateData,
        AuditHelper.createSystemContext({
          userId: updateData.userId,
          controller: 'EnhancedOrderController',
          action: 'updateOrder',
        }),
      );

      LoggingHelper.endPerformanceTimer(performanceTimer, this.logger, {
        orderId: id,
      });

      return ApiResponseHelper.success(order, 'อัปเดตออเดอร์สำเร็จ');
    } catch (err) {
      this.logger.error(`❌ Enhanced order update failed: ${err.message}`);

      LoggingHelper.logError(this.logger, err, {
        orderId: id,
        userId: updateData.userId,
      });

      const handledError = ErrorHandlingHelper.handleDatabaseError(err);
      return ApiResponseHelper.error(
        handledError.message,
        handledError.getStatus(),
      );
    }
  }

  /**
   * ❌ Cancel order with concurrency control
   * ยกเลิกออเดอร์พร้อมการจัดการ concurrency
   */
  @Delete(':id')
  @ApiOperation({ summary: 'ยกเลิกออเดอร์พร้อมการจัดการ concurrency' })
  @ApiResponse({ status: 200, description: 'ยกเลิกออเดอร์สำเร็จ' })
  @ApiResponse({
    status: 409,
    description: 'ไม่สามารถยกเลิกได้เนื่องจากสถานะเปลี่ยนแปลง',
  })
  async cancelOrder(
    @Param('id') id: string,
    @Body() cancelData: { userId: string },
  ) {
    try {
      const performanceTimer = LoggingHelper.createPerformanceTimer(
        'EnhancedOrderController.cancelOrder',
      );

      LoggingHelper.logBusinessEvent(
        this.logger,
        'Starting enhanced order cancellation',
        { orderId: id, userId: cancelData.userId },
      );

      this.logger.log(`❌ Enhanced order cancellation request: ${id}`);

      const result =
        await this.enhancedOrderService.cancelOrderWithConcurrencyControl(
          id,
          cancelData.userId,
        );

      // Log audit event for order cancellation
      await AuditHelper.logCancel(
        'order',
        id,
        'User requested cancellation',
        AuditHelper.createSystemContext({
          userId: cancelData.userId,
          controller: 'EnhancedOrderController',
          action: 'cancelOrder',
        }),
      );

      LoggingHelper.endPerformanceTimer(performanceTimer, this.logger, {
        orderId: id,
      });

      return ApiResponseHelper.success(result, 'ยกเลิกออเดอร์สำเร็จ');
    } catch (err) {
      this.logger.error(
        `❌ Enhanced order cancellation failed: ${err.message}`,
      );

      LoggingHelper.logError(this.logger, err, {
        orderId: id,
        userId: cancelData.userId,
      });

      const handledError = ErrorHandlingHelper.handleDatabaseError(err);
      return ApiResponseHelper.error(
        handledError.message,
        handledError.getStatus(),
      );
    }
  }

  /**
   * 🔒 Lock seats for temporary booking
   * ล็อคที่นั่งสำหรับการจองชั่วคราว
   */
  @Post('lock-seats')
  @ApiOperation({ summary: 'ล็อคที่นั่งสำหรับการจองชั่วคราว' })
  @ApiResponse({ status: 200, description: 'ล็อคที่นั่งสำเร็จ' })
  @ApiResponse({ status: 409, description: 'ที่นั่งไม่พร้อมใช้งาน' })
  async lockSeats(
    @Body()
    lockData: {
      seatIds: string[];
      showDate: string;
      lockDurationMinutes?: number;
    },
  ) {
    try {
      const performanceTimer = LoggingHelper.createPerformanceTimer(
        'EnhancedOrderController.lockSeats',
      );

      LoggingHelper.logBusinessEvent(this.logger, 'Starting seat locking', {
        seatCount: lockData.seatIds.length,
        showDate: lockData.showDate,
      });

      this.logger.log(
        `🔒 Seat locking request: ${lockData.seatIds.join(', ')}`,
      );

      const result = await this.concurrencyService.lockSeatsForOrder(
        lockData.seatIds,
        lockData.showDate,
        lockData.lockDurationMinutes || 5,
      );

      // Log audit event for seat locking
      await AuditHelper.log({
        action: AuditAction.UPDATE,
        entityType: 'seat_lock',
        entityId: lockData.seatIds.join(','),
        newData: {
          seats: lockData.seatIds,
          show_date: lockData.showDate,
          duration_minutes: lockData.lockDurationMinutes || 5,
        },
        context: AuditHelper.createSystemContext({
          controller: 'EnhancedOrderController',
          action: 'lockSeats',
        }),
      });

      LoggingHelper.endPerformanceTimer(performanceTimer, this.logger, {
        seatCount: lockData.seatIds.length,
      });

      return ApiResponseHelper.success(result, 'ล็อคที่นั่งสำเร็จ');
    } catch (err) {
      this.logger.error(`❌ Seat locking failed: ${err.message}`);

      LoggingHelper.logError(this.logger, err, {
        seatIds: lockData.seatIds,
      });

      const handledError = ErrorHandlingHelper.handleDatabaseError(err);
      return ApiResponseHelper.error(
        handledError.message,
        handledError.getStatus(),
      );
    }
  }

  /**
   * 🔓 Release seat locks
   * ปลดล็อคที่นั่ง
   */
  @Post('release-seats')
  @ApiOperation({ summary: 'ปลดล็อคที่นั่ง' })
  @ApiResponse({ status: 200, description: 'ปลดล็อคที่นั่งสำเร็จ' })
  async releaseSeats(@Body() releaseData: { seatIds: string[] }) {
    try {
      LoggingHelper.logBusinessEvent(this.logger, 'Starting seat release', {
        seatCount: releaseData.seatIds.length,
      });

      this.logger.log(
        `🔓 Seat release request: ${releaseData.seatIds.join(', ')}`,
      );

      await this.concurrencyService.releaseSeatLocks(releaseData.seatIds);

      // Log audit event for seat release
      await AuditHelper.log({
        action: AuditAction.DELETE,
        entityType: 'seat_lock',
        entityId: releaseData.seatIds.join(','),
        oldData: { seats: releaseData.seatIds },
        context: AuditHelper.createSystemContext({
          controller: 'EnhancedOrderController',
          action: 'releaseSeats',
        }),
      });

      return ApiResponseHelper.success(
        { released: releaseData.seatIds },
        'ปลดล็อคที่นั่งสำเร็จ',
      );
    } catch (err) {
      this.logger.error(`❌ Seat release failed: ${err.message}`);

      LoggingHelper.logError(this.logger, err, {
        seatIds: releaseData.seatIds,
      });

      const handledError = ErrorHandlingHelper.handleDatabaseError(err);
      return ApiResponseHelper.error(
        handledError.message,
        handledError.getStatus(),
      );
    }
  }

  /**
   * 📊 Get system health and concurrency statistics
   * ได้สถิติสุขภาพระบบและการจัดการ concurrency
   */
  @Get('system-health')
  @ApiOperation({ summary: 'ดูสถิติสุขภาพระบบและการจัดการ concurrency' })
  @ApiResponse({ status: 200, description: 'ได้สถิติสุขภาพระบบ' })
  async getSystemHealth() {
    try {
      const [systemHealth, cleanupStats] = await Promise.all([
        this.enhancedOrderService.getSystemHealth(),
        this.cleanupService.getCleanupStats(),
      ]);

      return ApiResponseHelper.success(
        {
          systemHealth,
          cleanupStats,
          timestamp: ThailandTimeHelper.now(),
        },
        'ได้สถิติสุขภาพระบบ',
      );
    } catch (err) {
      this.logger.error(`❌ System health check failed: ${err.message}`);

      LoggingHelper.logError(this.logger, err, {
        action: 'getSystemHealth',
      });

      const handledError = ErrorHandlingHelper.handleDatabaseError(err);
      return ApiResponseHelper.error(
        handledError.message,
        handledError.getStatus(),
      );
    }
  }

  /**
   * 📊 Get concurrency statistics
   * ได้สถิติการจัดการ concurrency
   */
  @Get('concurrency-stats')
  @ApiOperation({ summary: 'ดูสถิติการจัดการ concurrency' })
  @ApiResponse({ status: 200, description: 'ได้สถิติการจัดการ concurrency' })
  async getConcurrencyStats() {
    try {
      const [concurrencyStats, duplicateStats] = await Promise.all([
        this.concurrencyService.getConcurrencyStats(),
        this.duplicatePreventionService.getDuplicatePreventionStats(),
      ]);

      return ApiResponseHelper.success(
        {
          concurrency: concurrencyStats,
          duplicatePrevention: duplicateStats,
          timestamp: ThailandTimeHelper.now(),
        },
        'ได้สถิติการจัดการ concurrency',
      );
    } catch (err) {
      this.logger.error(`❌ Concurrency stats failed: ${err.message}`);

      LoggingHelper.logError(this.logger, err, {
        action: 'getConcurrencyStats',
      });

      const handledError = ErrorHandlingHelper.handleDatabaseError(err);
      return ApiResponseHelper.error(
        handledError.message,
        handledError.getStatus(),
      );
    }
  }

  /**
   * 🚨 Emergency cleanup
   * ทำความสะอาดฉุกเฉิน
   */
  @Post('emergency-cleanup')
  @ApiOperation({ summary: 'ทำความสะอาดฉุกเฉิน - Admin เท่านั้น' })
  @ApiResponse({ status: 200, description: 'ทำความสะอาดฉุกเฉินสำเร็จ' })
  async emergencyCleanup() {
    try {
      LoggingHelper.logSecurityEvent(
        this.logger,
        'Emergency cleanup initiated',
        { timestamp: new Date().toISOString() },
      );

      this.logger.warn('🚨 Emergency cleanup requested');

      await this.cleanupService.emergencyCleanup();

      // Log audit event for emergency cleanup
      await AuditHelper.log({
        action: AuditAction.DELETE,
        entityType: 'system_cleanup',
        entityId: 'emergency',
        oldData: { cleanup_type: 'emergency' },
        context: AuditHelper.createSystemContext({
          userRole: UserRole.SYSTEM,
          controller: 'EnhancedOrderController',
          action: 'emergencyCleanup',
          isSystemAction: true,
        }),
      });

      return ApiResponseHelper.success(
        { cleanedAt: ThailandTimeHelper.now() },
        'ทำความสะอาดฉุกเฉินสำเร็จ',
      );
    } catch (err) {
      this.logger.error(`❌ Emergency cleanup failed: ${err.message}`);

      LoggingHelper.logError(this.logger, err, {
        action: 'emergencyCleanup',
      });

      const handledError = ErrorHandlingHelper.handleDatabaseError(err);
      return ApiResponseHelper.error(
        handledError.message,
        handledError.getStatus(),
      );
    }
  }

  /**
   * 🧹 Manual cleanup
   * ทำความสะอาดด้วยตัวเอง
   */
  @Post('manual-cleanup')
  @ApiOperation({ summary: 'ทำความสะอาดด้วยตัวเอง - Admin เท่านั้น' })
  @ApiResponse({ status: 200, description: 'ทำความสะอาดสำเร็จ' })
  async manualCleanup() {
    try {
      LoggingHelper.logBusinessEvent(this.logger, 'Manual cleanup initiated', {
        timestamp: new Date().toISOString(),
      });

      this.logger.log('🧹 Manual cleanup requested');

      await Promise.all([
        this.cleanupService.cleanupExpiredSeatLocks(),
        this.cleanupService.cleanupExpiredOrders(),
      ]);

      // Log audit event for manual cleanup
      await AuditHelper.log({
        action: AuditAction.DELETE,
        entityType: 'system_cleanup',
        entityId: 'manual',
        oldData: {
          cleanup_type: 'manual',
          operations: ['expired_seat_locks', 'expired_orders'],
        },
        context: AuditHelper.createSystemContext({
          userRole: UserRole.SYSTEM,
          controller: 'EnhancedOrderController',
          action: 'manualCleanup',
          isSystemAction: true,
        }),
      });

      return ApiResponseHelper.success(
        { cleanedAt: ThailandTimeHelper.now() },
        'ทำความสะอาดสำเร็จ',
      );
    } catch (err) {
      this.logger.error(`❌ Manual cleanup failed: ${err.message}`);

      LoggingHelper.logError(this.logger, err, {
        action: 'manualCleanup',
      });

      const handledError = ErrorHandlingHelper.handleDatabaseError(err);
      return ApiResponseHelper.error(
        handledError.message,
        handledError.getStatus(),
      );
    }
  }
}
