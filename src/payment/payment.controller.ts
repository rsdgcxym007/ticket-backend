// src/payment/payment.controller.ts
import { Controller, Post, Body, Res, HttpStatus, Get } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Response } from 'express';

@Controller('api/scb')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // 📩 รับ Webhook
  @Post('payment-webhook')
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    const signature = body.signature;
    const verified = this.paymentService.verifyWebhookSignature(
      body,
      signature,
    );

    if (!verified) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'Invalid signature' });
    }

    // ✅ ทำ logic ต่อ เช่น อัปเดตสถานะคำสั่งซื้อ
    console.log('✅ Payment received:', body);
    return res.status(HttpStatus.OK).json({ message: 'OK' });
  }

  // 🧾 ขอ QR Payment
  @Post('payment-request')
  async requestQR(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createScbQr(dto.amount, dto.ref1, dto.ref2);
  }

  // ✅ Callback หลังจ่ายเงิน
  @Post('payment-confirm')
  confirmPayment() {
    return { message: 'Payment confirmed callback received.' };
  }

  // 🌐 Redirect กลับหน้าร้าน
  @Get('payment-redirect')
  redirectSuccess(@Res() res: Response) {
    return res.redirect('https://your-frontend.com/payment-success');
  }
}
