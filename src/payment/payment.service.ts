// src/payment/payment.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private baseUrl = 'https://api-scb-sandbox.com'; // เปลี่ยนตามจริง
  private secret = process.env.SCB_SECRET;
  private clientId = process.env.SCB_CLIENT_ID;
  private clientSecret = process.env.SCB_CLIENT_SECRET;

  // ขอ Access Token จาก SCB
  async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    const { data } = await axios.post(
      `${this.baseUrl}/v1/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return data.access_token;
  }

  // สร้าง QR Payment
  async createScbQr(amount: string, ref1: string, ref2: string) {
    const accessToken = await this.getAccessToken();

    const payload = {
      amount,
      ref1,
      ref2,
      ref3: ref1,
      currencyCode: 'THB',
    };

    const { data } = await axios.post(
      `${this.baseUrl}/v1/payment/qrcode/create`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return data;
  }

  // ตรวจสอบลายเซ็นจาก webhook
  verifyWebhookSignature(payload: any, signature: string): boolean {
    const clone = { ...payload };
    delete clone.signature;

    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(JSON.stringify(clone))
      .digest('hex');

    return expected === signature;
  }
}
