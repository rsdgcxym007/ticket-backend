// src/referrer/referrer.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referrer } from './referrer.entity';
import { ReferrerService } from './referrer.service';
import { ReferrerController } from './referrer.controller';
import { PaymentModule } from 'src/payment/payment.module';
import { Order } from 'src/order/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Referrer, Order]), PaymentModule],
  controllers: [ReferrerController],
  providers: [ReferrerService],
  exports: [ReferrerService, TypeOrmModule],
})
export class ReferrerModule {}
