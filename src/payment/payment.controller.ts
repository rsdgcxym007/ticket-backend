import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiResponseHelper } from '../common/utils';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('seated')
  @ApiOperation({ summary: 'ชำระเงินสำหรับตั๋วนั่ง (RINGSIDE/STADIUM)' })
  @ApiResponse({ status: 200, description: 'ชำระเงินสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ข้อมูลไม่ถูกต้อง' })
  @ApiResponse({ status: 404, description: 'ไม่พบคำสั่งซื้อ' })
  async paySeatedTicket(@Body() dto: CreatePaymentDto, @Req() req) {
    const payment = await this.paymentService.paySeatedTicket(dto, req.user);
    return ApiResponseHelper.success(payment, 'ชำระเงินตั๋วนั่งสำเร็จ');
  }

  @Post('standing')
  @ApiOperation({ summary: 'ชำระเงินสำหรับตั๋วยืน (STANDING)' })
  @ApiResponse({ status: 200, description: 'ชำระเงินสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ข้อมูลไม่ถูกต้อง' })
  @ApiResponse({ status: 404, description: 'ไม่พบคำสั่งซื้อ' })
  async payStandingTicket(@Body() dto: CreatePaymentDto, @Req() req) {
    const payment = await this.paymentService.payStandingTicket(dto, req.user);
    return ApiResponseHelper.success(payment, 'ชำระเงินตั๋วยืนสำเร็จ');
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'ดูข้อมูลการชำระเงินของคำสั่งซื้อ' })
  @ApiResponse({ status: 200, description: 'ดึงข้อมูลสำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบคำสั่งซื้อ' })
  async getOrderPaymentInfo(@Param('orderId') orderId: string) {
    const paymentInfo = await this.paymentService.getOrderPaymentInfo(orderId);
    return ApiResponseHelper.success(paymentInfo, 'ดึงข้อมูลการชำระเงินสำเร็จ');
  }

  @Patch('cancel/:orderId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'ยกเลิกการชำระเงิน (เฉพาะ Admin/Staff)' })
  @ApiResponse({ status: 200, description: 'ยกเลิกสำเร็จ' })
  @ApiResponse({ status: 403, description: 'ไม่มีสิทธิ์' })
  @ApiResponse({ status: 404, description: 'ไม่พบคำสั่งซื้อ' })
  async cancelPayment(
    @Param('orderId') orderId: string,
    @Body('reason') reason: string,
    @Req() req,
  ) {
    const result = await this.paymentService.cancelPayment(
      orderId,
      req.user.id,
      reason || 'ยกเลิกโดย Admin/Staff',
    );
    return ApiResponseHelper.success(result, 'ยกเลิกการชำระเงินสำเร็จ');
  }
}
