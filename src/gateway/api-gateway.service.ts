import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiVersion {
  version: string;
  path: string;
  deprecated: boolean;
  deprecationDate?: Date;
  supportedUntil?: Date;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface ApiAnalytics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);
  private apiVersions: Map<string, ApiVersion> = new Map();
  private analytics: ApiAnalytics[] = [];

  constructor(private readonly configService: ConfigService) {
    this.initializeApiVersions();
    this.logger.log('API Gateway Service initialized');
  }

  /**
   * Initialize supported API versions
   */
  private initializeApiVersions() {
    const versions: ApiVersion[] = [
      {
        version: 'v1',
        path: '/api/v1',
        deprecated: false,
      },
      {
        version: 'v2',
        path: '/api/v2',
        deprecated: false,
      },
      {
        version: 'v3',
        path: '/api/v3',
        deprecated: false,
      },
    ];

    versions.forEach((version) => {
      this.apiVersions.set(version.version, version);
    });

    this.logger.log(`Initialized ${versions.length} API versions`);
  }

  /**
   * Get supported API versions
   */
  getSupportedVersions(): ApiVersion[] {
    return Array.from(this.apiVersions.values());
  }

  /**
   * Get specific API version info
   */
  getVersionInfo(version: string): ApiVersion | null {
    return this.apiVersions.get(version) || null;
  }

  /**
   * Check if API version is supported
   */
  isVersionSupported(version: string): boolean {
    return this.apiVersions.has(version);
  }

  /**
   * Check if API version is deprecated
   */
  isVersionDeprecated(version: string): boolean {
    const versionInfo = this.apiVersions.get(version);
    return versionInfo ? versionInfo.deprecated : true;
  }

  /**
   * Get rate limit configuration for different user types
   */
  getRateLimitConfig(userType: string = 'anonymous'): RateLimitConfig {
    const configs = {
      admin: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10000, // 10,000 requests per window
        message:
          'Too many requests from admin account, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },
      premium: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5000, // 5,000 requests per window
        message:
          'Too many requests from premium account, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },
      user: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 1,000 requests per window
        message: 'Too many requests from user account, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },
      anonymous: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },
    };

    return configs[userType] || configs.anonymous;
  }

  /**
   * Get endpoint-specific rate limits
   */
  getEndpointRateLimit(endpoint: string): RateLimitConfig {
    const endpointConfigs = {
      '/auth/login': {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 login attempts per window
        message: 'Too many login attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },
      '/auth/register': {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registration attempts per hour
        message: 'Too many registration attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },
      '/payment': {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 10, // 10 payment requests per 5 minutes
        message: 'Too many payment requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },
      '/tickets/generate': {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 5, // 5 ticket generations per minute
        message: 'Too many ticket generation requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },
    };

    return endpointConfigs[endpoint] || this.getRateLimitConfig('user');
  }

  /**
   * Record API analytics
   */
  recordAnalytics(analytics: ApiAnalytics) {
    this.analytics.push({
      ...analytics,
      timestamp: new Date(),
    });

    // Keep only last 10,000 records to prevent memory issues
    if (this.analytics.length > 10000) {
      this.analytics = this.analytics.slice(-10000);
    }
  }

  /**
   * Get API analytics for a specific time period
   */
  getAnalytics(
    startDate?: Date,
    endDate?: Date,
    endpoint?: string,
  ): ApiAnalytics[] {
    let filtered = this.analytics;

    if (startDate) {
      filtered = filtered.filter((record) => record.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((record) => record.timestamp <= endDate);
    }

    if (endpoint) {
      filtered = filtered.filter((record) => record.endpoint === endpoint);
    }

    return filtered;
  }

  /**
   * Get API performance metrics
   */
  getPerformanceMetrics(endpoint?: string) {
    const data = endpoint
      ? this.analytics.filter((record) => record.endpoint === endpoint)
      : this.analytics;

    if (data.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 0,
      };
    }

    const totalRequests = data.length;
    const averageResponseTime =
      data.reduce((sum, record) => sum + record.responseTime, 0) /
      totalRequests;
    const successCount = data.filter(
      (record) => record.statusCode < 400,
    ).length;
    const successRate = (successCount / totalRequests) * 100;
    const errorRate = 100 - successRate;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Get most used endpoints
   */
  getMostUsedEndpoints(limit: number = 10) {
    const endpointCounts = new Map<string, number>();

    this.analytics.forEach((record) => {
      const count = endpointCounts.get(record.endpoint) || 0;
      endpointCounts.set(record.endpoint, count + 1);
    });

    return Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit: number = 10) {
    const endpointTimes = new Map<string, number[]>();

    this.analytics.forEach((record) => {
      const times = endpointTimes.get(record.endpoint) || [];
      times.push(record.responseTime);
      endpointTimes.set(record.endpoint, times);
    });

    return Array.from(endpointTimes.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        averageResponseTime:
          times.reduce((sum, time) => sum + time, 0) / times.length,
        requests: times.length,
      }))
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit);
  }

  /**
   * Get error analytics
   */
  getErrorAnalytics() {
    const errorRecords = this.analytics.filter(
      (record) => record.statusCode >= 400,
    );
    const statusCounts = new Map<number, number>();

    errorRecords.forEach((record) => {
      const count = statusCounts.get(record.statusCode) || 0;
      statusCounts.set(record.statusCode, count + 1);
    });

    return {
      totalErrors: errorRecords.length,
      errorRate: (errorRecords.length / this.analytics.length) * 100,
      statusCodeBreakdown: Array.from(statusCounts.entries()).map(
        ([code, count]) => ({
          statusCode: code,
          count,
        }),
      ),
    };
  }

  /**
   * Clear analytics data (for maintenance)
   */
  clearAnalytics() {
    this.analytics = [];
    this.logger.log('Analytics data cleared');
  }

  /**
   * Transform request data for different API versions
   */
  transformRequest(data: any, fromVersion: string, toVersion: string): any {
    if (fromVersion === toVersion) {
      return data;
    }

    // Add transformation logic here based on version differences
    // For now, return data as-is
    this.logger.log(`Transforming request from ${fromVersion} to ${toVersion}`);
    return data;
  }

  /**
   * Transform response data for different API versions
   */
  transformResponse(data: any, fromVersion: string, toVersion: string): any {
    if (fromVersion === toVersion) {
      return data;
    }

    // Add transformation logic here based on version differences
    // For now, return data as-is
    this.logger.log(
      `Transforming response from ${fromVersion} to ${toVersion}`,
    );
    return data;
  }
}
