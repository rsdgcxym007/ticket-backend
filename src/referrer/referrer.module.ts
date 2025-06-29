// src/referrer/referrer.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referrer } from './referrer.entity';
import { ReferrerService } from './referrer.service';
import { ReferrerController } from './referrer.controller';
import { PaymentModule } from 'src/payment/payment.module';
import { Order } from 'src/order/order.entity';
import { forwardRef, Module } from '@nestjs/common';
import { OrderModule } from 'src/order/order.module';

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
