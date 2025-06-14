// src/payment/kbank-payment.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as qs from 'qs';
import { firstValueFrom } from 'rxjs';
import dayjs from 'dayjs';

@Injectable()
export class KBankPaymentService {
  private baseUrl = process.env.KBANK_BASE_URL;
  private consumerId = process.env.KBANK_CONSUMER_ID;
  private consumerSecret = process.env.KBANK_CONSUMER_SECRET;
  constructor(private readonly http: HttpService) {}

  private cachedAccessToken: string | null = null;
  private tokenExpireAt: number | null = null;

  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // ถ้ามี token และยังไม่หมดอายุ ให้ใช้ของเดิม
    if (
      this.cachedAccessToken &&
      this.tokenExpireAt &&
      now < this.tokenExpireAt
    ) {
      return this.cachedAccessToken;
    }

    const credentials = Buffer.from(
      `${this.consumerId}:${this.consumerSecret}`,
    ).toString('base64');

    const headers = {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-test-mode': 'true',
      'env-id': 'OAUTH2',
    };

    const body = qs.stringify({ grant_type: 'client_credentials' });

    const response = await axios.post(`${this.baseUrl}/v2/oauth/token`, body, {
      headers,
    });

    const accessToken = response.data.access_token;
    const expiresIn = parseInt(response.data.expires_in || '0'); // วินาที

    // ตั้งเวลาให้หมดอายุล่วงหน้า 60 วินาที
    this.cachedAccessToken = accessToken;
    this.tokenExpireAt = now + (expiresIn - 60) * 1000;

    return this.cachedAccessToken;
  }

  async createThaiQrCode(amount: number): Promise<any> {
    const accessToken = await this.getAccessToken();
    console.log('accessToken', accessToken);
    console.log('cachedAccessToken', this.cachedAccessToken);

    const payload = {
      partnerTxnUid: 'PARTNERTEST0001-2',
      partnerId: 'PTR1051673',
      partnerSecret: 'd4bded59200547bc85903574a293831b',
      requestDt: dayjs().toISOString(),
      merchantId: 'KB102057149704',
      qrType: 4,
      txnAmount: amount.toFixed(2),
      txnCurrencyCode: 'THB',
      reference1: 'INV001',
      reference2: 'HELLOWORLD',
      reference3: 'INV001',
      reference4: 'INV001',
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-test-mode': 'true',
      'env-id': 'QR002',
    };

    try {
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/v1/qrpayment/request`, payload, {
          headers,
        }),
      );
      return response.data;
    } catch (error) {
      console.error(
        '❌ Error creating Thai QR:',
        error?.response?.data || error,
      );
      throw error;
    }
  }

  async generateQRCode(amount: number): Promise<any> {
    const accessToken = await this.getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-test-mode': 'true',
    };

    const payload = {
      qrType: 'PP',
      ppId: '0960415207',
      amount: amount.toFixed(2),
      ref1: 'ORDER001',
      ref2: 'TICKET001',
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/qrpayment/qrcode`,
        payload,
        { headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        '❌ Error generating PromptPay QR:',
        error?.response?.data || error,
      );
      throw error;
    }
  }

  async inquireStatus(qrRef1: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'x-test-mode': 'true',
    };

    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/qrpayment/inquiry?ref1=${qrRef1}`,
        { headers },
      );
      return response.data;
    } catch (error) {
      console.error(
        '❌ Error inquiring payment status:',
        error?.response?.data || error,
      );
      throw error;
    }
  }
}
