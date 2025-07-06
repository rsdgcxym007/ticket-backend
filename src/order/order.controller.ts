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

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  /**
   * 🎫 สร้างออเดอร์ใหม่
   */
  @Post()
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'สร้างออเดอร์ใหม่' })
  @ApiResponse({ status: 201, description: 'สร้างออเดอร์สำเร็จ' })
  @ApiResponse({ status: 400, description: 'ข้อมูลไม่ถูกต้อง' })
  @ApiResponse({ status: 403, description: 'เกินขั้นจำกัดการจอง' })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(
        `Request received for createOrder by user: ${req.user.id}`,
      );
      console.log('Request DTO:', dto);

      const data = await this.orderService.createOrder(dto, req.user.id);
      this.logger.log(`Order created successfully for user: ${req.user.id}`);
      return success(data, 'สร้างออเดอร์สำเร็จ', req);
    } catch (err) {
      this.logger.error(
        `Error creating order for user: ${req.user.id}`,
        err.stack,
      );
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
      const data = await this.orderService.findAll(
        { page, limit, status, search },
        req.user.id,
      );
      return success(data, 'ดึงรายการออเดอร์สำเร็จ', req);
    } catch (err) {
      return error(err.message, '400', req);
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
   * ❌ ยกเลิกออเดอร์
   */
  @Patch(':id/cancel')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'ยกเลิกออเดอร์' })
  @ApiResponse({ status: 200, description: 'ยกเลิกออเดอร์สำเร็จ' })
  @ApiResponse({ status: 400, description: 'ไม่สามารถยกเลิกได้' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const result = await this.orderService.cancel(id, req.user.id);
      return success(result, 'ยกเลิกออเดอร์สำเร็จ', req);
    } catch (err) {
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
}
