// src/referrer/referrer.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referrer } from './referrer.entity';
import { ReferrerService } from './referrer.service';
import { ReferrerController } from './referrer.controller';
import { PaymentModule } from '../payment/payment.module';
import { Order } from '../order/order.entity';
import { forwardRef, Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Referrer, Order]),
    PaymentModule,
    forwardRef(() => OrderModule),
  ],
  controllers: [ReferrerController],
  providers: [ReferrerService],
  exports: [ReferrerService, TypeOrmModule],
})
export class ReferrerModule {}
