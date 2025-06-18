// src/order/order.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './order.entity';
import { PaymentGateway } from 'src/payment/payment.gateway';
import { OrderRepository } from './order.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [OrderController],
  providers: [OrderService, PaymentGateway, OrderRepository],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
