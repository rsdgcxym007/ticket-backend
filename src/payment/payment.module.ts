// src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { KBankPaymentService } from './kbank-payment.service';
import { KBankPaymentController } from './kbank-payment.controller';
import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
@Module({
  imports: [HttpModule],
  providers: [KBankPaymentService, PaymentService],
  controllers: [KBankPaymentController, PaymentController],
  exports: [KBankPaymentService],
})
export class PaymentModule {}
