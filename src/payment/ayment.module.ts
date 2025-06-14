// src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { KBankPaymentService } from './kbank-payment.service';
import { KBankPaymentController } from './kbank-payment.controller';
import { HttpModule } from '@nestjs/axios';
@Module({
  imports: [HttpModule],
  providers: [KBankPaymentService],
  controllers: [KBankPaymentController],
  exports: [KBankPaymentService],
})
export class PaymentModule {}
