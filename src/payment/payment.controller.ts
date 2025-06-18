import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Get,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Response } from 'express';

@Controller('api/scb')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // 📩 รับ Webhook
  @Post('payment-webhook')
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    try {
      console.log('📩 Incoming Webhook:', body);

      if (!body.signature) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Missing signature' });
      }

      const verified = this.paymentService.verifyWebhookSignature(
        body,
        body.signature,
      );
      if (!verified) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Invalid signature' });
      }

      const requiredFields = [
        'ref1',
        'ref2',
        'amount',
        'status',
        'transactionId',
      ];
      const missing = requiredFields.filter((field) => !body[field]);
      if (missing.length > 0) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: `Missing fields: ${missing.join(', ')}` });
      }

      if (body.status !== 'SUCCESS') {
        return res
          .status(HttpStatus.OK)
          .json({ message: `Ignored status: ${body.status}` });
      }

      await this.paymentService.markOrderAsPaid(body.ref1, {
        transactionId: body.transactionId,
        amount: body.amount,
      });

      console.log('✅ Payment recorded for order', body.ref1);

      return res.status(HttpStatus.OK).json({ message: 'Payment processed' });
    } catch (err) {
      console.error('❌ Webhook error:', err);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Webhook processing failed',
        error: err?.message,
      });
    }
  }

  // 🧾 ขอ QR Payment
  @Post('payment-request')
  async requestQR(@Body() dto: CreatePaymentDto) {
    try {
      if (isNaN(+dto.amount) || +dto.amount <= 0) {
        throw new BadRequestException('Amount must be a positive number');
      }

      if (!dto.ref1 || !dto.ref2) {
        throw new BadRequestException('Missing ref1 or ref2');
      }

      const result = await this.paymentService.createScbQr(
        dto.amount,
        dto.ref1,
        dto.ref2,
      );
      console.log('result21321321', result);

      if (!result || !result.qrRawData) {
        throw new HttpException(
          'QR code not returned from SCB',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return { message: 'QR created', data: result };
    } catch (err) {
      console.error(
        '❌ Error generating QR:',
        err?.response?.data || err.message || err,
      );

      if (err.response?.data) {
        return {
          statusCode: err.response.status || 500,
          message: 'SCB API Error',
          error: err.response.data,
        };
      }

      throw new HttpException(
        {
          message: 'Failed to generate QR code',
          error: err.message,
        },
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
