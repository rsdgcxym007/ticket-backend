import { Controller, Get, Post, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  ScalabilityService,
  ScalabilityConfiguration,
} from './scalability.service';

@ApiTags('Scalability Infrastructure - Phase 5.3')
@Controller('api/v1/scalability')
export class ScalabilityController {
  constructor(private readonly scalabilityService: ScalabilityService) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Get comprehensive scalability metrics',
    description:
      'Returns real-time metrics for all scalability components including microservices, Redis cluster, database sharding, load balancer, and container orchestration',
  })
  @ApiResponse({
    status: 200,
    description: 'Scalability metrics retrieved successfully',
  })
  async getScalabilityMetrics() {
    return this.scalabilityService.getScalabilityMetrics();
  }

  @Post('auto-scale')
  @ApiOperation({
    summary: 'Trigger automatic scaling',
    description:
      'Automatically scale infrastructure components based on current load and performance metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-scaling completed successfully',
  })
  async autoScale() {
    return this.scalabilityService.autoScale();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check for scalability infrastructure',
    description: 'Comprehensive health check for all scalability components',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
  })
  async healthCheck() {
    return this.scalabilityService.healthCheck();
  }

  @Patch('configure')
  @ApiOperation({
    summary: 'Configure scalability settings',
    description:
      'Update configuration for auto-scaling, microservices, Redis cluster, and database sharding',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration applied successfully',
  })
  async configureScalability(
    @Body() configuration: Partial<ScalabilityConfiguration>,
  ) {
    return this.scalabilityService.configureScalability(configuration);
  }

  @Get('benchmark')
  @ApiOperation({
    summary: 'Get performance benchmarks',
    description:
      'Retrieve performance benchmarks including throughput, latency, and scalability metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance benchmarks retrieved successfully',
  })
  async performanceBenchmark() {
    return this.scalabilityService.performanceBenchmark();
  }

  @Get('recommendations')
  @ApiOperation({
    summary: 'Get scaling recommendations',
    description:
      'AI-powered recommendations for infrastructure scaling and optimization',
  })
  @ApiResponse({
    status: 200,
    description: 'Scaling recommendations generated successfully',
  })
  async getScalingRecommendations() {
    return this.scalabilityService.getScalingRecommendations();
  }
}
