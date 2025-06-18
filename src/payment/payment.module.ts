// src/payment/payment.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { KBankPaymentService } from './kbank-payment.service';
import { KBankPaymentController } from './kbank-payment.controller';
import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/order/order.entity';
import { OrderModule } from 'src/order/order.module';
import { PaymentGateway } from './payment.gateway';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Order]),
    forwardRef(() => OrderModule),
  ],
  providers: [KBankPaymentService, PaymentService, PaymentGateway],
  controllers: [KBankPaymentController, PaymentController],
  exports: [KBankPaymentService, PaymentService],
})
export class PaymentModule {}
