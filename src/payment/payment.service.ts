// src/payment/payment.service.ts
import * as QRCode from 'qrcode';
import { Injectable } from '@nestjs/common';
import generatePayload from 'promptpay-qr';

@Injectable()
export class PaymentService {
  async generatePromptpayQRCode(amount: number): Promise<string> {
    const payload = generatePayload('0960415207', { amount });
    const qr = await QRCode.toDataURL(payload);
    return qr;
  }
}
