import {
  Controller,
  Post,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  Req,
  Res,
  UseGuards,
  Query,
  ParseUUIDPipe,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
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
      // ถ้าเป็น ONSITE ให้ validate เฉพาะ quantity, ticketType, showDate
      // if (dto.purchaseType === OrderPurchaseType.ONSITE) {
      //   if (!dto.quantity || !dto.ticketType || !dto.showDate) {
      //     throw new BadRequestException(
      //       'ONSITE ต้องระบุจำนวนตั๋ว, ประเภท, และวันที่แสดง',
      //     );
      //   }
      //   // ลบข้อมูลที่ไม่จำเป็นสำหรับ ONSITE
      //   dto.customerName = undefined;
      //   dto.customerPhone = undefined;
      //   dto.customerEmail = undefined;
      // } else {
      //   // สำหรับประเภทอื่นๆ ให้ validate ตามปกติ
      //   if (
      //     !dto.customerName ||
      //     !dto.customerPhone ||
      //     !dto.showDate ||
      //     !dto.ticketType ||
      //     !dto.quantity
      //   ) {
      //     throw new BadRequestException('กรุณาระบุข้อมูลให้ครบถ้วน');
      //   }
      // }
      dto.createdBy = req.user.id;
      const data =
        await this.enhancedOrderService.createOrderWithConcurrencyControl(
          req.user.id,
          dto,
        );
      return success(data, 'สร้างออเดอร์สำเร็จ (ป้องกัน race condition)', req);
    } catch (err) {
      // Handle specific concurrency errors
      if (
        err.message &&
        (err.message.includes('duplicate') || err.message.includes('DUPLICATE'))
      ) {
        throw new ConflictException(err.message);
      }
      if (
        err.message &&
        (err.message.includes('rate limit') ||
          err.message.includes('RATE_LIMIT'))
      ) {
        throw new BadRequestException(err.message);
      }
      throw new BadRequestException(err.message);
    }
  }

  /**
   * 🧑‍💼 รายชื่อ staff/admin/master ที่สร้างออเดอร์ (option dropdown)
   */
  @Get('master/staff-admin')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({
    summary: 'รายชื่อ staff/admin/master ที่สร้างออเดอร์ (option dropdown)',
  })
  @ApiResponse({ status: 200, description: 'ดึงรายชื่อสำเร็จ' })
  async getOrderCreators(@Req() req: AuthenticatedRequest) {
    const orders = await this.orderService.findAll({ limit: 10000 }, undefined);
    const creatorMap = new Map();
    if (orders && Array.isArray(orders.items)) {
      for (const order of orders.items) {
        if (order.createdById && order.createdByName) {
          creatorMap.set(order.createdById, order.createdByName);
        }
      }
    }
    const creators = [
      { value: '', label: 'ทั้งหมด' },
      ...Array.from(creatorMap.entries()).map(([id, name]) => {
        return {
          value: id,
          label: name,
        };
      }),
    ];
    return success(creators, 'ดึงรายชื่อ staff/admin/master สำเร็จ', req);
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
  @ApiQuery({ name: 'referrerName', required: false, type: String })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: String,
    description: 'กรองตามผู้สร้างออเดอร์ (userId staff/admin)',
  })
  @ApiQuery({
    name: 'purchaseType',
    required: false,
    enum: ['WEBSITE', 'BOOKING', 'ONSITE'],
    description: 'กรองตามประเภทการซื้อ',
  })
  @ApiQuery({
    name: 'attendanceStatus',
    required: false,
    enum: ['PENDING', 'CHECKED_IN', 'NO_SHOW'],
    description: 'กรองตามสถานะการเข้าร่วมงาน',
  })
  @ApiQuery({ name: 'referrerName', required: false, type: String })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('createdBy') createdBy?: string,
    @Query('showDate') showDate?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('purchaseType') purchaseType?: string,
    @Query('attendanceStatus') attendanceStatus?: string,
    @Query('referrerName') referrerName?: string,
  ) {
    try {
      const result = await this.orderService.findAll(
        {
          page,
          limit,
          status,
          search,
          createdBy,
          showDate,
          paymentMethod,
          purchaseType,
          attendanceStatus,
          referrerName,
        },
        req.user.id,
      );

      return success(
        {
          data: Array.isArray(result.items) ? result.items : [],
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
        'ดึงรายการออเดอร์สำเร็จ',
        req,
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
      return success(data, 'ดึงรายละเอียดออเดอร์สำเร็จ', req);
    } catch (err) {
      if (err.status === 404 || err.name === 'NotFoundException') throw err;
      return error(err.message, '400', req);
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
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    try {
      this.logger.log(`🛡️ Enhanced cancel request for order: ${id}`);
      // กรณีไม่มี req ให้ส่ง userId เป็น undefined
      const result =
        await this.enhancedOrderService.cancelOrderWithConcurrencyControl(
          id,
          undefined,
        );
      this.logger.log(`✅ Enhanced cancel successful for order: ${id}`);
      // ต้องมี result.success === true เท่านั้นถึงจะสำเร็จ
      if (
        !result ||
        typeof result.success !== 'boolean' ||
        result.success !== true
      ) {
        if (
          result &&
          result.message &&
          (result.message.includes('not found') ||
            result.message.includes('ไม่พบ'))
        ) {
          throw new NotFoundException(result.message || 'Order not found');
        }
        // ถ้ามี message อื่นที่สื่อถึง conflict ให้ throw 409
        if (
          result &&
          result.message &&
          (result.message.includes('already cancelled') ||
            result.message.includes('already processed') ||
            result.message.includes('ซ้ำ') ||
            result.message.includes('cancelled'))
        ) {
          throw new ConflictException(result.message);
        }
        throw new NotFoundException('Order not found');
      }
      // เพิ่ม robust check: ถ้า success === true แต่ไม่มี id หรือ status !== 'CANCELLED' ให้ throw 404
      let orderId: string | undefined = undefined;
      let orderStatus: string | undefined = undefined;
      // Helper: get nested order object
      const getOrderObj = (res: any) => {
        if (res && typeof res === 'object') {
          if (res.data && typeof res.data === 'object') return res.data;
          if (res.updatedOrder && typeof res.updatedOrder === 'object')
            return res.updatedOrder;
        }
        return res;
      };
      const orderObj = getOrderObj(result);
      if (orderObj) {
        orderId = orderObj.id;
        orderStatus = orderObj.status;
      }
      // รองรับสถานะที่ขึ้นต้นด้วย 'CANCEL' (case-insensitive)
      if (
        !orderId ||
        !orderStatus ||
        typeof orderStatus !== 'string' ||
        !orderStatus.toUpperCase().startsWith('CANCEL')
      ) {
        throw new NotFoundException('Order not found');
      }
      // ส่งกลับเฉพาะ id เท่านั้น
      return { id: orderId };
    } catch (err) {
      this.logger.error(`❌ Error cancelling order: ${id}`, err.stack);
      // ถ้าเป็น HttpException ให้ throw ออกไปเลย เพื่อให้ NestJS ตอบ status code ที่ถูกต้อง
      if (err instanceof ConflictException || err instanceof NotFoundException)
        throw err;
      // รองรับกรณี legacy ที่อาจใช้ err.status/err.name
      if (err.status === 409 || err.name === 'ConflictException')
        throw new ConflictException(err.message);
      if (err.status === 404 || err.name === 'NotFoundException')
        throw new NotFoundException(err.message);
      // ไม่ใช้ req ใน error response อีกต่อไป
      return { message: err.message, error: 'Cancel Error', statusCode: 400 };
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
      console.log('id', id, req.user.id);

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
      // ถ้า seatIds เป็น array ว่าง ให้ throw BadRequestException
      if (
        !Array.isArray(changeSeatsDto.seatIds) ||
        changeSeatsDto.seatIds.length === 0
      ) {
        throw new BadRequestException('seatIds must not be empty');
      }
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
      // ต้องมี result.success === true เท่านั้นถึงจะสำเร็จ
      if (
        !result ||
        typeof result.success !== 'boolean' ||
        result.success !== true
      ) {
        throw new BadRequestException(
          result && result.message ? result.message : 'Change seats failed',
        );
      }
      // robust: ถ้า success === true แต่ไม่มี id หรือไม่มี seatBookings/seats ที่เป็น array ไม่ว่าง ให้ throw 400
      if (result.success === true) {
        // Helper: get nested order object
        const getOrderObj = (res: any) => {
          if (res && typeof res === 'object') {
            if (res.updatedOrder && typeof res.updatedOrder === 'object') {
              return res.updatedOrder;
            }
            if (res.data && typeof res.data === 'object') {
              return res.data;
            }
          }
          return res;
        };
        const orderObj = getOrderObj(result);
        // ตรวจสอบ id และ array ที่เกี่ยวกับที่นั่ง (seatIds, seatBookings, seats)
        const hasValidSeats =
          (Array.isArray(orderObj?.seatIds) && orderObj.seatIds.length > 0) ||
          (Array.isArray(orderObj?.seatBookings) &&
            orderObj.seatBookings.length > 0) ||
          (Array.isArray(orderObj?.seats) && orderObj.seats.length > 0);
        if (!orderObj?.id || !hasValidSeats) {
          throw new BadRequestException('Change seats failed: invalid result');
        }
      }
      return success(result, 'เปลี่ยนที่นั่งสำเร็จ', req);
    } catch (err) {
      // ถ้าเป็น HttpException ให้ throw ออกไปเลย เพื่อให้ NestJS ตอบ status code ที่ถูกต้อง
      if (err instanceof BadRequestException) {
        throw err;
      }
      if (err.status === 400 || err.name === 'BadRequestException') {
        throw new BadRequestException(err.message);
      }
      // ถ้าไม่ใช่ BadRequestException ให้ throw 500
      throw err;
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
      if (err.status === 404 || err.name === 'NotFoundException') throw err;
      return error(err.message, '400', req);
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
        message: 'ล็อกที่นั่งชั่วคราวสำเร็จ',
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
        message: 'ปลดล็อกที่นั่งสำเร็จ',
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
        { message: 'ล้างข้อมูลชั่วคราวสำเร็จ' },
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

  /**
   * 📄 Export ข้อมูลออเดอร์เป็น Excel/CSV
   */
  @Get('export/excel')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export ข้อมูลออเดอร์เป็นไฟล์ Excel' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'referrerName', required: false, type: String })
  @ApiQuery({ name: 'createdBy', required: false, type: String })
  @ApiQuery({ name: 'showDate', required: false, type: String })
  @ApiQuery({ name: 'paymentMethod', required: false, type: String })
  @ApiQuery({
    name: 'purchaseType',
    required: false,
    enum: ['WEBSITE', 'BOOKING', 'ONSITE'],
  })
  @ApiQuery({
    name: 'attendanceStatus',
    required: false,
    enum: ['PENDING', 'CHECKED_IN', 'NO_SHOW'],
  })
  @ApiQuery({
    name: 'includeAllPages',
    required: false,
    type: Boolean,
    description: 'รวมข้อมูลทุกหน้า',
  })
  @ApiResponse({ status: 200, description: 'Export สำเร็จ' })
  async exportOrders(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('createdBy') createdBy?: string,
    @Query('showDate') showDate?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('purchaseType') purchaseType?: string,
    @Query('attendanceStatus') attendanceStatus?: string,
    @Query('includeAllPages') includeAllPages: boolean = true,
    @Query('referrerName') referrerName?: string,
  ) {
    try {
      // ดึงข้อมูลทั้งหมดที่ตรงตาม filter (ไม่จำกัดจำนวนหน้า)
      const exportData = await this.orderService.exportOrdersData({
        status,
        search,
        createdBy,
        showDate,
        paymentMethod,
        purchaseType,
        attendanceStatus,
        includeAllPages,
        referrerName,
      });

      return success(exportData, 'Export ข้อมูลออเดอร์สำเร็จ', req);
    } catch (err) {
      return error(err.message, '400', req);
    }
  }

  /**
   * 📄 Export ข้อมูลออเดอร์เป็น PDF Preview ตามรูปแบบตารางใบเสร็จ
   */
  @Get('export/pdf')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export ข้อมูลออเดอร์เป็นไฟล์ PDF Preview' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'referrerName', required: false, type: String })
  @ApiQuery({ name: 'createdBy', required: false, type: String })
  @ApiQuery({ name: 'showDate', required: false, type: String })
  @ApiQuery({ name: 'paymentMethod', required: false, type: String })
  @ApiQuery({
    name: 'purchaseType',
    required: false,
    enum: ['WEBSITE', 'BOOKING', 'ONSITE'],
  })
  @ApiQuery({
    name: 'attendanceStatus',
    required: false,
    enum: ['PENDING', 'CHECKED_IN', 'NO_SHOW'],
  })
  @ApiQuery({
    name: 'includeAllPages',
    required: false,
    type: Boolean,
    description: 'รวมข้อมูลทุกหน้า',
  })
  @ApiResponse({ status: 200, description: 'Export PDF สำเร็จ' })
  async exportOrdersPdf(
    @Req() req: AuthenticatedRequest,
    @Res() res: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('createdBy') createdBy?: string,
    @Query('showDate') showDate?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('purchaseType') purchaseType?: string,
    @Query('attendanceStatus') attendanceStatus?: string,
    @Query('includeAllPages') includeAllPages: boolean = true,
    @Query('referrerName') referrerName?: string,
  ) {
    try {
      // ดึงข้อมูลทั้งหมดที่ตรงตาม filter
      const exportData = await this.orderService.exportOrdersData({
        status,
        search,
        createdBy,
        showDate,
        paymentMethod,
        purchaseType,
        attendanceStatus,
        includeAllPages,
        referrerName,
      });

      // สร้าง PDF ตามรูปแบบตารางใบเสร็จ
      const pdfBuffer = await this.orderService.generateOrdersPDF(exportData);

      // ส่ง PDF กลับให้ front-end
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="orders-export.pdf"',
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (err) {
      this.logger.error('❌ Error exporting PDF:', err.stack);
      return error(err.message, '400', req);
    }
  }
}
