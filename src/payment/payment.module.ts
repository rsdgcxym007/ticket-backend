import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { Order } from 'src/order/order.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { OrderModule } from 'src/order/order.module';
import { SeatsModule } from 'src/seats/seat.module';
import { ReferrerModule } from 'src/referrer/referrer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order]),
    forwardRef(() => OrderModule),
    forwardRef(() => SeatsModule),
    forwardRef(() => ReferrerModule),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
