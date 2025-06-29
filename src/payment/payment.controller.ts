import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { success } from 'src/common/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  paymentService: any;
  constructor(private readonly service: PaymentService) {}

  @Post()
  async pay(@Body() dto: CreatePaymentDto, @Req() req) {
    const data = await this.service.payWithCash(dto, req.user);
    return success(data, 'ชำระเงินด้วยเงินสดสำเร็จ', req);
  }

  @Post('pay-standing')
  async payStanding(@Body() dto: CreatePaymentDto, @Req() req) {
    const payment = await this.service.payWithCashStanding(dto, req.user);
    return success(payment, 'ชำระเงินตั๋วยืนสำเร็จ', req);
  }
}
