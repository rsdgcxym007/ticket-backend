import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Application health check' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-07-05T10:30:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
        database: { type: 'string', example: 'connected' },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'string', example: '45.2 MB' },
            total: { type: 'string', example: '128 MB' },
          },
        },
      },
    },
  })
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get('database')
  @ApiOperation({ summary: 'Database health check' })
  @ApiResponse({ status: 200, description: 'Database connection status' })
  async getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('memory')
  @ApiOperation({ summary: 'Memory usage information' })
  @ApiResponse({ status: 200, description: 'Current memory usage' })
  async getMemoryUsage() {
    return this.healthService.getMemoryUsage();
  }
}
