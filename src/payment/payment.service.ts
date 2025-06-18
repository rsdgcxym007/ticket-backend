import {
  Injectable,
  HttpException,
  HttpStatus,
  forwardRef,
  Inject,
} from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { OrderService } from '../order/order.service';

@Injectable()
export class PaymentService {
  private baseUrl =
    process.env.SCB_BASE_URL ||
    'https://api-sandbox.partners.scb/partners/sandbox';
  private secret = process.env.SCB_SECRET;
  private clientId = process.env.SCB_CLIENT_ID;
  private clientSecret = process.env.SCB_CLIENT_SECRET;
  private accessToken: string | null = null;
  private expiresAt: number | null = null;

  constructor(
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.accessToken && this.expiresAt && now < this.expiresAt) {
      return this.accessToken;
    }

    const headers = {
      'content-type': 'application/json',
      resourceOwnerId: this.clientId,
      requestUId: crypto.randomUUID(),
      'accept-language': 'EN',
    };

    const payload = {
      applicationKey: this.clientId,
      applicationSecret: this.clientSecret,
    };

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/v1/oauth/token`,
        payload,
        { headers },
      );

      this.accessToken = data.data.accessToken;
      console.log('this.accessToken', this.accessToken);

      this.expiresAt = now + Number(data.data.expiresAt) * 1000 - 10_000;

      return this.accessToken;
    } catch (error) {
      console.error(
        '❌ Failed to fetch access token:',
        error?.response?.data || error,
      );
      throw new HttpException('SCB Auth Error', HttpStatus.UNAUTHORIZED);
    }
  }

  async createScbQr(amount: string, ref1: string, ref2: string) {
    const accessToken = await this.getAccessToken();
    console.log('accessTokenaccessToken', accessToken);

    const payload = {
      qrType: 'PP',
      amount,
      ppType: 'BILLERID',
      ppId: process.env.SCB_PP_ID,
      ref1,
      ref2,
      ref3: `BQE${ref1}`,
    };

    const signature = this.generateSignature(payload);

    const headers = {
      'content-type': 'application/json',
      resourceOwnerId: this.clientId,
      requestUId: crypto.randomUUID(),
      authorization: `Bearer ${accessToken}`,
      'accept-language': 'EN',
    };

    let response;
    try {
      response = await axios.post(
        `${this.baseUrl}/v1/payment/qrcode/create`,
        { ...payload, signature },
        { headers },
      );
    } catch (error) {
      console.error('❌ Axios Error (SCB QR):', error?.response?.data || error);
      throw new HttpException(
        {
          message: 'SCB API Error (network or authentication)',
          error: error?.response?.data || error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = response.data;

    if (result?.status?.code !== 1000) {
      throw new HttpException(
        {
          message: 'SCB API returned error',
          error: result.status,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!result?.data?.qrImage || !result?.data?.qrRawData) {
      throw new HttpException(
        {
          message: 'QR code not returned from SCB',
          error: result,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      qrRawData: result.data.qrRawData,
      qrImage: result.data.qrImage,
    };
  }

  async markOrderAsPaid(
    orderId: string,
    data: { transactionId: string; amount: string },
  ) {
    const order = await this.orderService.findByOrderId(orderId);

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    order.status = 'PAID';
    order.transactionId = data.transactionId;
    order.paidAt = new Date();

    await this.orderService.save(order);
  }

  generateSignature(data: Record<string, any>): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  verifyWebhookSignature(
    payload: Record<string, any>,
    signature: string,
  ): boolean {
    const clone = { ...payload };
    delete clone.signature;

    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(JSON.stringify(clone))
      .digest('hex');

    return expected === signature;
  }
}
