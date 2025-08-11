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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ChangeSeatsDto } from './dto/change-seats.dto';
import { ExportOrdersDto } from './dto/export-orders.dto';
import { ImportOrdersDto } from './dto/import-orders.dto';
import { error, success } from '../common/responses';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AuthenticatedRequest } from '../common/interfaces/auth.interface';
import { OrderData } from './mappers/order-data.mapper';
import { EnhancedOrderService } from '../common/services/enhanced-order.service';
import { ConcurrencyService } from '../common/services/concurrency.service';
import { OrderUpdatesGateway } from '../common/gateways/order-updates.gateway';
import { OrderControllerHelper } from './utils/controller.helper';

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
    private readonly orderUpdatesGateway: OrderUpdatesGateway,
  ) {}

  /**
   * 🎫 สร้างออเดอร์ใหม่
   * ใช้ EnhancedOrderService พร้อมการป้องกัน race condition และ duplicate orders
   */
  @Post()
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'สร้างออเดอร์ใหม่' })
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
      // เพิ่ม createdBy เพื่อระบุผู้สร้างออเดอร์
      dto.createdBy = req.user.id;

      // ใช้ EnhancedOrderService ที่มีการจัดการ concurrency และป้องกันออเดอร์ซ้ำ
      const data =
        await this.enhancedOrderService.createOrderWithConcurrencyControl(
          req.user.id,
          dto,
        );

      return success(data, 'สร้างออเดอร์สำเร็จ', req);
    } catch (err) {
      // จัดการ error types ต่างๆ
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

    return OrderControllerHelper.createPaginationResponse(
      result,
      'ดึงรายการออเดอร์สำเร็จ',
      req,
    );
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
    const data = await this.orderService.findById(id, req.user.id);
    return OrderControllerHelper.createSuccessResponse(
      data,
      'ดึงรายละเอียดออเดอร์สำเร็จ',
      req,
    );
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
    const updates: Partial<OrderData> = {
      ...dto,
      showDate: dto.showDate ? dto.showDate : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    };

    const data = await this.orderService.update(id, updates, req.user.id);
    return OrderControllerHelper.createSuccessResponse(
      data,
      'อัปเดตออเดอร์สำเร็จ',
      req,
    );
  }

  /**
   * ❌ ยกเลิกออเดอร์
   */
  @Patch(':id/cancel')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ยกเลิกออเดอร์' })
  @ApiResponse({ status: 200, description: 'ยกเลิกออเดอร์สำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบออเดอร์' })
  @ApiResponse({ status: 409, description: 'ออเดอร์ถูกประมวลผลแล้ว' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const result =
      await this.enhancedOrderService.cancelOrderWithConcurrencyControl(
        id,
        undefined,
      );

    if (!result?.success) {
      const message = result?.message || 'Order not found';
      if (message.includes('not found') || message.includes('ไม่พบ')) {
        throw new NotFoundException(message);
      }
      if (
        message.includes('already cancelled') ||
        message.includes('cancelled')
      ) {
        throw new ConflictException(message);
      }
      throw new NotFoundException('Order not found');
    }

    const orderObj =
      (result as any).data || (result as any).updatedOrder || result;
    const orderId = orderObj?.id;
    const orderStatus = orderObj?.status;

    if (!orderId || !orderStatus?.toUpperCase().startsWith('CANCEL')) {
      throw new NotFoundException('Order not found');
    }

    return { id: orderId };
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
   * 🔄 เปลี่ยนที่นั่ง / อัพเดทข้อมูลออเดอร์
   */
  @Patch(':id/change-seats')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'เปลี่ยนที่นั่งหรืออัพเดทข้อมูลออเดอร์' })
  @ApiResponse({ status: 200, description: 'อัพเดทข้อมูลสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ไม่สามารถอัพเดทข้อมูลได้' })
  async changeSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeSeatsDto: ChangeSeatsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.orderService.changeSeats(
      id,
      changeSeatsDto,
      req.user.id,
    );

    if (!result?.success) {
      throw new BadRequestException(result?.message || 'อัพเดทข้อมูลล้มเหลว');
    }

    // ตรวจสอบว่ามี updatedOrder กลับมาหรือไม่
    if (!result.updatedOrder?.id) {
      throw new BadRequestException(
        'อัพเดทข้อมูลล้มเหลว: ไม่พบข้อมูลออเดอร์ที่อัพเดท',
      );
    }

    return success(result, result.message || 'อัพเดทข้อมูลสำเร็จ', req);
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
   * 🔒 ล็อกที่นั่งชั่วคราว
   */
  @Post('seats/lock')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ล็อกที่นั่งชั่วคราว' })
  @ApiResponse({ status: 201, description: 'ล็อกที่นั่งสำเร็จ' })
  @ApiResponse({ status: 409, description: 'ที่นั่งถูกจองแล้ว' })
  async lockSeats(
    @Body() dto: { seatIds: string[]; showDate: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.concurrencyService.lockSeatsForOrder(
      dto.seatIds,
      dto.showDate,
      5, // 5 minutes lock
    );

    this.orderUpdatesGateway.notifySeatLocked({
      seatIds: dto.seatIds,
      showDate: dto.showDate,
      userId: req.user.id,
      message: 'ล็อกที่นั่งชั่วคราวสำเร็จ',
    });

    return success(result, 'ล็อกที่นั่งสำเร็จ', req);
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
    const result = await this.concurrencyService.releaseSeatLocks(dto.seatIds);

    this.orderUpdatesGateway.notifySeatUnlocked({
      seatIds: dto.seatIds,
      showDate: dto.showDate,
      userId: req.user.id,
      message: 'ปลดล็อกที่นั่งสำเร็จ',
    });

    return success(result, 'ปลดล็อกที่นั่งสำเร็จ', req);
  }

  /**
   * 💓 ตรวจสอบสถานะระบบ
   */
  @Get('system/health')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ตรวจสอบสถานะระบบ' })
  @ApiResponse({ status: 200, description: 'ข้อมูลสถานะระบบ' })
  async getSystemHealth(@Req() req: AuthenticatedRequest) {
    const health = await this.enhancedOrderService.getSystemHealth();
    return success(health, 'ข้อมูลสถานะระบบ', req);
  }

  /**
   * 🧹 ทำความสะอาดล็อกที่หมดอายุ
   */
  @Post('system/cleanup')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ทำความสะอาดล็อกและออเดอร์ที่หมดอายุ' })
  @ApiResponse({ status: 200, description: 'ทำความสะอาดสำเร็จ' })
  async cleanupExpiredLocks(@Req() req: AuthenticatedRequest) {
    await this.concurrencyService.cleanupExpiredSeatLocks();
    return success(
      { message: 'ล้างข้อมูลชั่วคราวสำเร็จ' },
      'ทำความสะอาดสำเร็จ',
      req,
    );
  }

  /**
   * 📊 สถิติระบบ Enhanced
   */
  @Get('system/stats')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'สถิติการทำงานของ Enhanced Order System' })
  @ApiResponse({ status: 200, description: 'ข้อมูลสถิติระบบ' })
  async getEnhancedSystemStats(@Req() req: AuthenticatedRequest) {
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
  }

  /**
   * 📄 Export ข้อมูลออเดอร์เป็น Excel/CSV
   */
  @Get('export/excel')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export ข้อมูลออเดอร์เป็นไฟล์ Excel/CSV' })
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
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel'],
    description: 'รูปแบบไฟล์ที่ต้องการ',
  })
  @ApiResponse({ status: 200, description: 'Export สำเร็จ' })
  async exportOrders(
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
    @Query('format') format: 'csv' | 'excel' = 'csv',
  ) {
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

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      const excelBuffer =
        await this.orderService.generateOrdersExcel(exportData);

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="orders-export-${timestamp}.xlsx"`,
        'Content-Length': excelBuffer.length,
      });

      res.send(excelBuffer);
    } else {
      const csvContent = await this.orderService.generateOrdersCSV(exportData);

      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-export-${timestamp}.csv"`,
        'Content-Length': Buffer.byteLength(csvContent, 'utf8'),
      });

      res.send(csvContent);
    }
  }

  /**
   * 📄 Export ข้อมูลออเดอร์เป็น PDF
   */
  @Get('export/pdf')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export ข้อมูลออเดอร์เป็นไฟล์ PDF' })
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

    const pdfBuffer = await this.orderService.generateOrdersPDF(exportData);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="orders-export.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  // ========================================
  // 📤 EXPORT/IMPORT ENDPOINTS
  // ========================================

  @Post('export-spreadsheet')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Export orders to spreadsheet format (Excel/CSV)',
    description: 'Export selected orders by IDs to CSV or Excel format',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders exported successfully',
    schema: { type: 'string', format: 'binary' },
  })
  async exportOrdersToSpreadsheet(
    @Body() exportOrdersDto: ExportOrdersDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: any,
  ) {
    // ดึงข้อมูลออเดอร์ทั้งหมดก่อน
    const exportData = await this.orderService.exportOrdersData({
      includeAllPages: true,
    });

    // แปลง orderIds ให้เป็น array ถ้าเป็น object
    let orderIds: string[] = [];

    if (exportOrdersDto.orderIds) {
      if (Array.isArray(exportOrdersDto.orderIds)) {
        // ถ้าเป็น array อยู่แล้ว
        orderIds = exportOrdersDto.orderIds;
      } else if (typeof exportOrdersDto.orderIds === 'object') {
        // ถ้าเป็น object ให้แปลงเป็น array ของ IDs
        const values = Object.values(exportOrdersDto.orderIds as any);

        // ตรวจสอบว่า value แต่ละตัวเป็น string หรือ object
        orderIds = values
          .map((value: any) => {
            if (typeof value === 'string') {
              // ถ้าเป็น string ให้ใช้เลย (รูปแบบใหม่)
              return value;
            } else if (typeof value === 'object' && value.id) {
              // ถ้าเป็น object ที่มี property id (รูปแบบเก่า)
              return value.id;
            }
            return null;
          })
          .filter((id) => id); // กรองเฉพาะที่มี id
      }
    }

    console.log('📋 Processed orderIds:', orderIds);

    // กรองเฉพาะออเดอร์ที่ต้องการ (ถ้าระบุ IDs)
    if (orderIds && orderIds.length > 0) {
      const beforeFilter = exportData.orders.length;
      exportData.orders = exportData.orders.filter((order) =>
        orderIds.includes(order.id),
      );
      console.log(
        `🔄 Filtered from ${beforeFilter} to ${exportData.orders.length} orders`,
      );

      // Debug: แสดง IDs ที่พบจริง
      const foundIds = exportData.orders.map((order) => order.id);
      console.log('✅ Found order IDs:', foundIds);

      const notFoundIds = orderIds.filter((id) => !foundIds.includes(id));
      if (notFoundIds.length > 0) {
        console.log('❌ Not found order IDs:', notFoundIds);
      }
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const format = exportOrdersDto.format || 'csv';

    console.log(`📊 Export format: ${format}`);
    console.log(`📊 Orders to export: ${exportData.orders.length}`);
    if (format === 'excel') {
      try {
        console.log('🔄 Generating Excel file...');
        const excelBuffer =
          await this.orderService.generateOrdersExcel(exportData);
        console.log(
          '✅ Excel file generated successfully, size:',
          excelBuffer.length,
        );

        // ตรวจสอบว่า buffer เป็น Excel จริง
        if (!Buffer.isBuffer(excelBuffer) || excelBuffer.length < 1000) {
          throw new Error('Invalid Excel buffer generated');
        }

        // ตรวจสอบ magic bytes ของ Excel file
        const magicBytes = excelBuffer.slice(0, 4);
        const isValidExcel = magicBytes.equals(
          Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        ); // ZIP signature (Excel is ZIP-based)

        if (!isValidExcel) {
          console.error('❌ Generated file is not a valid Excel format');
          throw new Error('Generated file is not Excel format');
        }

        console.log('🔍 Excel validation passed - sending Excel file');

        res.set({
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="orders-export-${timestamp}.xlsx"`,
          'Content-Length': excelBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'Access-Control-Expose-Headers': 'Content-Disposition',
        });

        return res.end(excelBuffer, 'binary');
      } catch (error) {
        console.error('❌ Excel generation failed:', error);
        throw new BadRequestException(
          `Excel generation failed: ${error.message}`,
        );
      }
    } else {
      try {
        console.log('🔄 Generating CSV file...');
        const csvContent =
          await this.orderService.generateOrdersCSV(exportData);
        console.log(
          '✅ CSV file generated successfully, length:',
          csvContent.length,
        );

        // เพิ่ม BOM สำหรับ UTF-8 encoding ใน CSV
        const csvWithBOM = '\uFEFF' + csvContent;

        res.set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="orders-export-${timestamp}.csv"`,
          'Content-Length': Buffer.byteLength(csvWithBOM, 'utf8'),
        });

        res.send(csvWithBOM);
      } catch (error) {
        console.error('❌ CSV generation failed:', error);
        throw new BadRequestException(
          `CSV generation failed: ${error.message}`,
        );
      }
    }
  }

  @Post('import-spreadsheet')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Import and update orders from spreadsheet data',
    description: 'Import spreadsheet data and update orders',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders imported and updated successfully',
  })
  async importOrdersFromSpreadsheet(
    @Body() importOrdersDto: ImportOrdersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.orderService.importAndUpdateOrders(
      importOrdersDto.importData,
      req.user.id,
    );

    return success(result, 'นำเข้าและอัปเดตข้อมูลออเดอร์เรียบร้อยแล้ว', req);
  }

  /**
   * 📤 Import ออเดอร์จากไฟล์ CSV/Excel
   */
  @Post('import-file')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary: 'Import orders from CSV/Excel file',
    description: 'Upload and import orders from CSV or Excel file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Import ไฟล์สำเร็จ' })
  @ApiResponse({ status: 400, description: 'ไฟล์ไม่ถูกต้องหรือข้อมูลผิดพลาด' })
  @UseInterceptors(FileInterceptor('file'))
  async importOrdersFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('กรุณาเลือกไฟล์สำหรับ import');
    }

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'ไฟล์ต้องเป็นประเภท CSV หรือ Excel (.csv, .xls, .xlsx)',
      );
    }

    // รองรับไฟล์ขนาดใหญ่สำหรับ import ข้อมูลจำนวนมาก
    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('ไฟล์มีขนาดใหญ่เกิน 50MB');
    }

    this.logger.log(
      `📤 Starting import: ${file.originalname} (${file.size} bytes)`,
    );

    const result = await this.orderService.importOrdersFromFileBuffer(
      file.buffer,
      file.mimetype,
      file.originalname,
      req.user.id,
    );

    this.logger.log('✅ Import completed successfully');

    return success(result, 'นำเข้าไฟล์ออเดอร์สำเร็จ', req);
  }

  // =============================================
  // 🚀 FUTURE: BATCH PROCESSING (ยังไม่ได้ implement)
  // =============================================
  // TODO: เพิ่ม batch processing สำหรับข้อมูลขนาดใหญ่ในอนาคต
}
