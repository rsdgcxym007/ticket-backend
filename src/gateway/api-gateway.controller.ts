import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiGatewayService } from './api-gateway.service';

@ApiTags('API Gateway')
@Controller('gateway')
export class ApiGatewayController {
  private readonly logger = new Logger(ApiGatewayController.name);

  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Get('versions')
  @ApiOperation({ summary: 'Get supported API versions' })
  @ApiResponse({ status: 200, description: 'List of supported API versions' })
  getSupportedVersions() {
    return {
      versions: this.apiGatewayService.getSupportedVersions(),
      current: 'v3',
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get API analytics summary' })
  @ApiResponse({ status: 200, description: 'API analytics data' })
  getAnalytics() {
    return this.apiGatewayService.getAnalytics();
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  getPerformanceMetrics() {
    return this.apiGatewayService.getPerformanceMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check API Gateway health' })
  @ApiResponse({ status: 200, description: 'Gateway health status' })
  checkHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      versions: this.apiGatewayService.getSupportedVersions(),
      uptime: process.uptime(),
    };
  }

  @Get('rate-limits')
  @ApiOperation({ summary: 'Get rate limit configurations' })
  @ApiResponse({ status: 200, description: 'Rate limit configurations' })
  getRateLimits() {
    return {
      userTypes: {
        admin: this.apiGatewayService.getRateLimitConfig('admin'),
        premium: this.apiGatewayService.getRateLimitConfig('premium'),
        user: this.apiGatewayService.getRateLimitConfig('user'),
        anonymous: this.apiGatewayService.getRateLimitConfig('anonymous'),
      },
      endpointSpecific: {
        '/auth/login':
          this.apiGatewayService.getEndpointRateLimit('/auth/login'),
        '/auth/register':
          this.apiGatewayService.getEndpointRateLimit('/auth/register'),
        '/payment': this.apiGatewayService.getEndpointRateLimit('/payment'),
        '/tickets/generate':
          this.apiGatewayService.getEndpointRateLimit('/tickets/generate'),
      },
    };
  }

  @Post('clear-analytics')
  @ApiOperation({ summary: 'Clear analytics data' })
  @ApiResponse({ status: 200, description: 'Analytics cleared successfully' })
  clearAnalytics() {
    this.apiGatewayService.clearAnalytics();
    return { message: 'Analytics data cleared' };
  }

  @Post('test-rate-limit')
  @ApiOperation({ summary: 'Test rate limiting configuration' })
  @ApiResponse({ status: 200, description: 'Rate limit test results' })
  testRateLimit(@Body() body: { userType: string; endpoint?: string }) {
    const { userType, endpoint } = body;

    let config;
    if (endpoint) {
      config = this.apiGatewayService.getEndpointRateLimit(endpoint);
    }

    if (!config) {
      config = this.apiGatewayService.getRateLimitConfig(userType);
    }

    return {
      userType,
      endpoint: endpoint || 'general',
      configuration: config,
      windowMinutes: config.windowMs / (60 * 1000),
    };
  }

  @Get('version-info/:version')
  @ApiOperation({ summary: 'Get information about a specific API version' })
  @ApiResponse({ status: 200, description: 'Version information' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  getVersionInfo(@Body('version') version: string) {
    const info = this.apiGatewayService.getVersionInfo(version);

    if (!info) {
      return { error: 'Version not found' };
    }

    return {
      version: info.version,
      path: info.path,
      deprecated: info.deprecated,
      deprecationDate: info.deprecationDate,
      supportedUntil: info.supportedUntil,
      isSupported: this.apiGatewayService.isVersionSupported(version),
    };
  }
}
