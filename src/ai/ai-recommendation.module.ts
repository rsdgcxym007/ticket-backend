import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIRecommendationService } from './ai-recommendation.service';
import { AIRecommendationController } from './ai-recommendation.controller';
import { Seat } from '../seats/seat.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';
import { Zone } from '../zone/zone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Seat, User, Order, Zone])],
  controllers: [AIRecommendationController],
  providers: [AIRecommendationService],
  exports: [AIRecommendationService],
})
export class AIRecommendationModule {}
