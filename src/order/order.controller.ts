import {
  Controller,
  Post,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
  Query,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ChangeSeatsDto } from './dto/change-seats.dto';
import { error, success } from '../common/responses';
import { ApiResponseHelper } from '../common/utils';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AuthenticatedRequest } from '../common/interfaces/auth.interface';
import { OrderData } from '../common/interfaces';
import { EnhancedOrderService } from '../common/services/enhanced-order.service';
import { ConcurrencyService } from '../common/services/concurrency.service';
import { DuplicateOrderPreventionService } from '../common/services/duplicate-order-prevention.service';
import { OrderUpdatesGateway } from '../common/gateways/order-updates.gateway';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly enhancedOrderService: EnhancedOrderService,
    private readonly concurrencyService: ConcurrencyService,
    private readonly duplicatePreventionService: DuplicateOrderPreventionService,
    private readonly orderUpdatesGateway: OrderUpdatesGateway, // Inject the WebSocket gateway
  ) {}

  /**
   * 🎫 สร้างออเดอร์ใหม่ (Enhanced with Concurrency Protection)
   */
  @Post()
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'สร้างออเดอร์ใหม่ (ป้องกัน race condition)' })
  @ApiResponse({ status: 201, description: 'สร้างออเดอร์สำเร็จ' })
  @ApiResponse({ status: 400, description: 'ข้อมูลไม่ถูกต้อง' })
  @ApiResponse({ status: 403, description: 'เกินขั้นจำกัดการจอง' })
  @ApiResponse({
    status: 409,
    description: 'ออเดอร์ซ้ำกันหรือที่นั่งไม่พร้อมใช้งาน',
  })
  @ApiResponse({ status: 429, description: 'คำขอมากเกินไป' })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(
        `🛡️ Enhanced order creation request from user: ${req.user.id}`,
      );

      // ✅ ใช้ Enhanced Order Service แทน Legacy Service
      const data =
        await this.enhancedOrderService.createOrderWithConcurrencyControl(
          req.user.id,
          dto,
        );

      this.logger.log(
        `✅ Enhanced order created successfully for user: ${req.user.id}`,
      );
      return success(data, 'สร้างออเดอร์สำเร็จ (ป้องกัน race condition)', req);
    } catch (err) {
      this.logger.error(
        `❌ Error creating enhanced order for user: ${req.user.id}`,
        err.stack,
      );

      // Handle specific concurrency errors
      if (
        err.message.includes('duplicate') ||
        err.message.includes('DUPLICATE')
      ) {
        return error(err.message, '409', req);
      }
      if (
        err.message.includes('rate limit') ||
        err.message.includes('RATE_LIMIT')
      ) {
        return error(err.message, '429', req);
      }

      return error(err.message, '400', req);
    }
  }

  /**
   * 📋 ดูรายการออเดอร์ทั้งหมด
   */
  @Get()
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ดูรายการออเดอร์' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.orderService.findAll(
        { page, limit, status, search },
        req.user.id,
      );

      return ApiResponseHelper.paginated(
        result.items,
        result.total,
        result.page,
        result.limit,
        'ดึงรายการออเดอร์สำเร็จ',
      );
    } catch (err) {
      return ApiResponseHelper.error(
        err.message,
        err.status || 400,
        'ORD_FIND_ALL_ERROR',
      );
    }
  }

  /**
   * 🔍 ดูรายละเอียดออเดอร์
   */
  @Get(':id')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ดูรายละเอียดออเดอร์' })
  @ApiResponse({ status: 200, description: 'ดึงรายละเอียดออเดอร์สำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบออเดอร์' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const data = await this.orderService.findById(id, req.user.id);
      console.log('datadatadata', data);

      return success(data, 'ดึงรายละเอียดออเดอร์สำเร็จ', req);
    } catch (err) {
      return error(err.message, '404', req);
    }
  }

  /**
   * ✏️ อัปเดตออเดอร์
   */
  @Patch(':id')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'อัปเดตออเดอร์' })
  @ApiResponse({ status: 200, description: 'อัปเดตออเดอร์สำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบออเดอร์' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const updates: Partial<OrderData> = {
        ...dto,
        showDate: dto.showDate ? dto.showDate : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      };

      const data = await this.orderService.update(id, updates, req.user.id);
      return success(data, 'อัปเดตออเดอร์สำเร็จ', req);
    } catch (err) {
      return error(err.message, '400', req);
    }
  }

  /**
   * ❌ ยกเลิกออเดอร์ (Enhanced with Concurrency Protection)
   */
  @Patch(':id/cancel')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ยกเลิกออเดอร์ (ป้องกัน race condition)' })
  @ApiResponse({ status: 200, description: 'ยกเลิกออเดอร์สำเร็จ' })
  @ApiResponse({ status: 400, description: 'ไม่สามารถยกเลิกได้' })
  @ApiResponse({ status: 409, description: 'ออเดอร์ถูกประมวลผลแล้ว' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(
        `🛡️ Enhanced cancel request for order: ${id} by user: ${req.user.id}`,
      );

      // ✅ ใช้ Enhanced Order Service แทน Legacy Service
      const result =
        await this.enhancedOrderService.cancelOrderWithConcurrencyControl(
          id,
          req.user.id,
        );

      this.logger.log(`✅ Enhanced cancel successful for order: ${id}`);
      return success(
        result,
        'ยกเลิกออเดอร์สำเร็จ (ป้องกัน race condition)',
        req,
      );
    } catch (err) {
      this.logger.error(`❌ Error cancelling order: ${id}`, err.stack);

      if (
        err.message.includes('already processed') ||
        err.message.includes('CONFLICT')
      ) {
        return error(err.message, '409', req);
      }

      return error(err.message, '400', req);
    }
  }

  /**
   * ✅ ยืนยันการชำระเงิน
   */
  @Patch(':id/confirm-payment')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ยืนยันการชำระเงิน' })
  @ApiResponse({ status: 200, description: 'ยืนยันการชำระเงินสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ไม่สามารถยืนยันได้' })
  async confirmPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const result = await this.orderService.confirmPayment(id, req.user.id);
      return success(result, 'ยืนยันการชำระเงินสำเร็จ', req);
    } catch (err) {
      return error(err.message, '400', req);
    }
  }

  /**
   * 🎟️ ออกตั๋ว
   */
  @Get(':id/tickets')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ออกตั๋ว' })
  @ApiResponse({ status: 200, description: 'ออกตั๋วสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ไม่สามารถออกตั๋วได้' })
  async generateTickets(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const tickets = await this.orderService.generateTickets(id, req.user.id);
      return success(tickets, 'ออกตั๋วสำเร็จ', req);
    } catch (err) {
      return error(err.message, '400', req);
    }
  }

  /**
   * 🔄 เปลี่ยนที่นั่ง
   */
  @Patch(':id/change-seats')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'เปลี่ยนที่นั่ง' })
  @ApiResponse({ status: 200, description: 'เปลี่ยนที่นั่งสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ไม่สามารถเปลี่ยนที่นั่งได้' })
  async changeSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeSeatsDto: ChangeSeatsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const result = await this.orderService.changeSeats(
        id,
        changeSeatsDto.seatIds, // These are now seat numbers, not IDs
        req.user.id,
        changeSeatsDto.newReferrerCode,
        changeSeatsDto.newCustomerName,
        changeSeatsDto.newCustomerPhone,
        changeSeatsDto.newCustomerEmail,
        changeSeatsDto.newShowDate,
      );
      return success(result, 'เปลี่ยนที่นั่งสำเร็จ', req);
    } catch (err) {
      return error(err.message, '400', req);
    }
  }

  /**
   * 📊 สถิติออเดอร์
   */
  @Get('stats/overview')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'สถิติออเดอร์' })
  @ApiResponse({ status: 200, description: 'ดึงสถิติสำเร็จ' })
  async getStats(@Req() req: AuthenticatedRequest) {
    try {
      const stats = await this.orderService.getOrderStats();
      return success(stats, 'ดึงสถิติสำเร็จ', req);
    } catch (err) {
      return error(err.message, '400', req);
    }
  }

  /**
   * 🗑️ ลบออเดอร์ (Admin เท่านั้น)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ลบออเดอร์' })
  @ApiResponse({ status: 200, description: 'ลบออเดอร์สำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบออเดอร์' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const data = await this.orderService.remove(id, req.user.id);
      return success(data, 'ลบออเดอร์สำเร็จ', req);
    } catch (err) {
      return error(err.message, '404', req);
    }
  }

  /**
   * 🔄 อัปเดตออเดอร์ประเภท Standing
   */
  @Patch(':id/update-standing-order')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'อัปเดตออเดอร์ประเภท TicketType.STANDING' })
  @ApiResponse({ status: 200, description: 'อัปเดตออเดอร์สำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบออเดอร์' })
  async updateStandingOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const updates: Partial<OrderData> = {
        ...dto,
        showDate: dto.showDate ? dto.showDate : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      };

      const data = await this.orderService.updateStandingOrder(
        id,
        updates,
        req.user.id,
      );
      return success(data, 'อัปเดตออเดอร์สำเร็จ', req);
    } catch (err) {
      return error(err.message, '400', req);
    }
  }

  // =============================================
  // 🛡️ ENHANCED CONCURRENCY CONTROL ENDPOINTS
  // =============================================

  /**
   * 🔒 ล็อกที่นั่งชั่วคราว (สำหรับ frontend)
   */
  @Post('seats/lock')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ล็อกที่นั่งชั่วคราว (ป้องกัน race condition)' })
  @ApiResponse({ status: 201, description: 'ล็อกที่นั่งสำเร็จ' })
  @ApiResponse({ status: 409, description: 'ที่นั่งถูกจองแล้ว' })
  async lockSeats(
    @Body() dto: { seatIds: string[]; showDate: string },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`🔒 Locking seats for user: ${req.user.id}`, dto);

      const result = await this.concurrencyService.lockSeatsForOrder(
        dto.seatIds,
        dto.showDate,
        5, // 5 minutes lock
      );

      // ✅ Send real-time notification to frontend
      this.orderUpdatesGateway.notifySeatLocked({
        seatIds: dto.seatIds,
        showDate: dto.showDate,
        userId: req.user.id,
        message: 'Seats locked temporarily',
      });

      this.logger.log(`✅ Seats locked successfully for user: ${req.user.id}`);
      return success(result, 'ล็อกที่นั่งสำเร็จ', req);
    } catch (err) {
      this.logger.error(
        `❌ Error locking seats for user: ${req.user.id}`,
        err.stack,
      );

      if (
        err.message.includes('already locked') ||
        err.message.includes('CONFLICT')
      ) {
        return error(err.message, '409', req);
      }

      return error(err.message, '400', req);
    }
  }

  /**
   * 🔓 ปลดล็อกที่นั่งชั่วคราว
   */
  @Post('seats/unlock')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ปลดล็อกที่นั่งชั่วคราว' })
  @ApiResponse({ status: 200, description: 'ปลดล็อกที่นั่งสำเร็จ' })
  async unlockSeats(
    @Body() dto: { seatIds: string[]; showDate: string },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`🔓 Unlocking seats for user: ${req.user.id}`, dto);

      const result = await this.concurrencyService.releaseSeatLocks(
        dto.seatIds,
      );

      // ✅ Send real-time notification to frontend
      this.orderUpdatesGateway.notifySeatUnlocked({
        seatIds: dto.seatIds,
        showDate: dto.showDate,
        userId: req.user.id,
        message: 'Seats unlocked',
      });

      this.logger.log(
        `✅ Seats unlocked successfully for user: ${req.user.id}`,
      );
      return success(result, 'ปลดล็อกที่นั่งสำเร็จ', req);
    } catch (err) {
      this.logger.error(
        `❌ Error unlocking seats for user: ${req.user.id}`,
        err.stack,
      );
      return error(err.message, '400', req);
    }
  }

  /**
   * 💓 ตรวจสอบสถานะระบบ Concurrency
   */
  @Get('system/health')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ตรวจสอบสถานะระบบ Concurrency' })
  @ApiResponse({ status: 200, description: 'ข้อมูลสถานะระบบ' })
  async getSystemHealth(@Req() req: AuthenticatedRequest) {
    try {
      const health = await this.enhancedOrderService.getSystemHealth();
      return success(health, 'ข้อมูลสถานะระบบ', req);
    } catch (err) {
      return error(err.message, '400', req);
    }
  }

  /**
   * 🧹 ทำความสะอาดล็อกที่หมดอายุ
   */
  @Post('system/cleanup')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ทำความสะอาดล็อกและออเดอร์ที่หมดอายุ' })
  @ApiResponse({ status: 200, description: 'ทำความสะอาดสำเร็จ' })
  async cleanupExpiredLocks(@Req() req: AuthenticatedRequest) {
    try {
      this.logger.log('🧹 Manual cleanup triggered by admin');

      // ใช้ ConcurrencyService แทน
      await this.concurrencyService.cleanupExpiredSeatLocks();

      this.logger.log('✅ Manual cleanup completed');
      return success(
        { message: 'Cleanup completed' },
        'ทำความสะอาดสำเร็จ',
        req,
      );
    } catch (err) {
      this.logger.error('❌ Error during manual cleanup', err.stack);
      return error(err.message, '400', req);
    }
  }

  /**
   * 📊 ดูสถิติการทำงานของ Enhanced Order System
   */
  @Get('system/stats')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'สถิติการทำงานของ Enhanced Order System' })
  @ApiResponse({ status: 200, description: 'ข้อมูลสถิติระบบ' })
  async getEnhancedSystemStats(@Req() req: AuthenticatedRequest) {
    try {
      // ใช้ข้อมูลพื้นฐาน
      const basicStats = {
        timestamp: new Date().toISOString(),
        systemStatus: 'Enhanced Order System Active',
        features: [
          'Concurrency Control',
          'Duplicate Prevention',
          'Seat Locking',
          'Atomic Transactions',
        ],
      };

      return success(basicStats, 'ข้อมูลสถิติระบบ Enhanced', req);
    } catch (err) {
      return error(err.message, '400', req);
    }
  }
}
