import { Module } from '@nestjs/common';
import { ScalabilityService } from './scalability.service';
import { ScalabilityController } from './scalability.controller';
import { MicroservicesService } from './services/microservices.service';
import { RedisClusterService } from './services/redis-cluster.service';
import { DatabaseShardingService } from './services/database-sharding.service';
import { LoadBalancerService } from './services/load-balancer.service';
import { ContainerOrchestrationService } from './services/container-orchestration.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([])],
  controllers: [ScalabilityController],
  providers: [
    ScalabilityService,
    MicroservicesService,
    RedisClusterService,
    DatabaseShardingService,
    LoadBalancerService,
    ContainerOrchestrationService,
  ],
  exports: [
    ScalabilityService,
    MicroservicesService,
    RedisClusterService,
    DatabaseShardingService,
    LoadBalancerService,
    ContainerOrchestrationService,
  ],
})
export class ScalabilityModule {}
