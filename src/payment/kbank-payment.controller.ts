// src/payment/kbank-payment.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { KBankPaymentService } from './kbank-payment.service';

@Controller('kbank')
export class KBankPaymentController {
  constructor(private readonly kbankService: KBankPaymentService) {}

  @Get('test-token')
  async testAccessToken() {
    const token = await this.kbankService['getAccessToken']();
    return { access_token: token };
  }

  @Get('thai-qr/:amount')
  async testThaiQr(@Param('amount') amount: number) {
    const data = await this.kbankService.createThaiQrCode(Number(amount));
    return data;
  }

  @Get('promptpay/:amount')
  async testPromptPay(@Param('amount') amount: number) {
    const data = await this.kbankService.generateQRCode(Number(amount));
    return data;
  }

  @Get('status/:ref1')
  async getStatus(@Param('ref1') ref1: string) {
    const data = await this.kbankService.inquireStatus(ref1);
    return data;
  }
}
