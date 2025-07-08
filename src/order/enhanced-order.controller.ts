import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Get,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EnhancedOrderService } from '../common/services/enhanced-order.service';
import { ConcurrencyService } from '../common/services/concurrency.service';
import { DuplicateOrderPreventionService } from '../common/services/duplicate-order-prevention.service';
import { ConcurrencyCleanupService } from '../common/services/concurrency-cleanup.service';
import { ThailandTimeHelper } from '../common/utils/thailand-time.helper';

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
      this.logger.log(
        `🎫 Enhanced order creation request from user: ${orderData.userId}`,
      );

      const order =
        await this.enhancedOrderService.createOrderWithConcurrencyControl(
          orderData.userId,
          orderData,
        );

      return {
        success: true,
        data: order,
        message: 'สร้างออเดอร์สำเร็จ พร้อมการป้องกันการซ้ำกัน',
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (err) {
      this.logger.error(`❌ Enhanced order creation failed: ${err.message}`);

      // Return appropriate error status based on error type
      let statusCode = HttpStatus.BAD_REQUEST;
      if (
        err.message.includes('ถูกจองโดยผู้อื่น') ||
        err.message.includes('กำลังถูกประมวลผล')
      ) {
        statusCode = HttpStatus.CONFLICT;
      }

      return {
        success: false,
        error: err.message,
        statusCode,
        timestamp: ThailandTimeHelper.now(),
      };
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
      this.logger.log(`🔄 Enhanced order update request: ${id}`);

      const order =
        await this.enhancedOrderService.updateOrderWithConcurrencyControl(
          id,
          updateData.userId,
          updateData,
        );

      return {
        success: true,
        data: order,
        message: 'อัปเดตออเดอร์สำเร็จ',
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (err) {
      this.logger.error(`❌ Enhanced order update failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: ThailandTimeHelper.now(),
      };
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
      this.logger.log(`❌ Enhanced order cancellation request: ${id}`);

      const result =
        await this.enhancedOrderService.cancelOrderWithConcurrencyControl(
          id,
          cancelData.userId,
        );

      return {
        success: true,
        data: result,
        message: 'ยกเลิกออเดอร์สำเร็จ',
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (err) {
      this.logger.error(
        `❌ Enhanced order cancellation failed: ${err.message}`,
      );
      return {
        success: false,
        error: err.message,
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: ThailandTimeHelper.now(),
      };
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
      this.logger.log(
        `🔒 Seat locking request: ${lockData.seatIds.join(', ')}`,
      );

      const result = await this.concurrencyService.lockSeatsForOrder(
        lockData.seatIds,
        lockData.showDate,
        lockData.lockDurationMinutes || 5,
      );

      return {
        success: true,
        data: result,
        message: 'ล็อคที่นั่งสำเร็จ',
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (err) {
      this.logger.error(`❌ Seat locking failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        statusCode: HttpStatus.CONFLICT,
        timestamp: ThailandTimeHelper.now(),
      };
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
      this.logger.log(
        `🔓 Seat release request: ${releaseData.seatIds.join(', ')}`,
      );

      await this.concurrencyService.releaseSeatLocks(releaseData.seatIds);

      return {
        success: true,
        data: { released: releaseData.seatIds },
        message: 'ปลดล็อคที่นั่งสำเร็จ',
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (err) {
      this.logger.error(`❌ Seat release failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: ThailandTimeHelper.now(),
      };
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

      return {
        success: true,
        data: {
          systemHealth,
          cleanupStats,
          timestamp: ThailandTimeHelper.now(),
        },
        message: 'ได้สถิติสุขภาพระบบ',
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (err) {
      this.logger.error(`❌ System health check failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: ThailandTimeHelper.now(),
      };
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

      return {
        success: true,
        data: {
          concurrency: concurrencyStats,
          duplicatePrevention: duplicateStats,
          timestamp: ThailandTimeHelper.now(),
        },
        message: 'ได้สถิติการจัดการ concurrency',
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (err) {
      this.logger.error(`❌ Concurrency stats failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: ThailandTimeHelper.now(),
      };
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
      this.logger.warn('🚨 Emergency cleanup requested');

      await this.cleanupService.emergencyCleanup();

      return {
        success: true,
        data: { cleanedAt: ThailandTimeHelper.now() },
        message: 'ทำความสะอาดฉุกเฉินสำเร็จ',
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (err) {
      this.logger.error(`❌ Emergency cleanup failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: ThailandTimeHelper.now(),
      };
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
      this.logger.log('🧹 Manual cleanup requested');

      await Promise.all([
        this.cleanupService.cleanupExpiredSeatLocks(),
        this.cleanupService.cleanupExpiredOrders(),
      ]);

      return {
        success: true,
        data: { cleanedAt: ThailandTimeHelper.now() },
        message: 'ทำความสะอาดสำเร็จ',
        timestamp: ThailandTimeHelper.now(),
      };
    } catch (err) {
      this.logger.error(`❌ Manual cleanup failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: ThailandTimeHelper.now(),
      };
    }
  }
}
