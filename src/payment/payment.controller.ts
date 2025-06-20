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
  constructor(private readonly service: PaymentService) {}

  @Post('cash')
  async payWithCash(@Body() dto: CreatePaymentDto, @Req() req) {
    const result = await this.service.payWithCash(dto);
    return success(result, 'ชำระเงินสดเรียบร้อยแล้ว', req);
  }
}
