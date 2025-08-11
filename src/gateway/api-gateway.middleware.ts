import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiGatewayService } from './api-gateway.service';

@Injectable()
export class ApiVersioningMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiVersioningMiddleware.name);

  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Extract API version from header, query param, or URL path
    let version = this.extractApiVersion(req);

    // Default to latest version if not specified
    if (!version) {
      version = 'v3';
      this.logger.debug(`No API version specified, defaulting to ${version}`);
    }

    // Validate version
    if (!this.apiGatewayService.isVersionSupported(version)) {
      return res.status(400).json({
        error: 'Unsupported API version',
        message: `API version ${version} is not supported`,
        supportedVersions: this.apiGatewayService.getSupportedVersions(),
      });
    }

    // Check for deprecated versions
    if (this.apiGatewayService.isVersionDeprecated(version)) {
      const versionInfo = this.apiGatewayService.getVersionInfo(version);
      res.setHeader('X-API-Deprecated', 'true');
      if (versionInfo?.deprecationDate) {
        res.setHeader(
          'X-API-Deprecation-Date',
          versionInfo.deprecationDate.toISOString(),
        );
      }
      if (versionInfo?.supportedUntil) {
        res.setHeader(
          'X-API-Support-Until',
          versionInfo.supportedUntil.toISOString(),
        );
      }
    }

    // Store version in request for later use
    req['apiVersion'] = version;

    // Set response headers
    res.setHeader('X-API-Version', version);

    // Record analytics after response
    const originalSend = res.send;
    res.send = function (data) {
      const responseTime = Date.now() - startTime;

      // Record analytics
      setTimeout(() => {
        try {
          const apiGateway = req.app.get('ApiGatewayService');
          if (apiGateway) {
            apiGateway.recordAnalytics({
              endpoint: req.path,
              method: req.method,
              responseTime,
              statusCode: res.statusCode,
              timestamp: new Date(),
              userAgent: req.get('User-Agent'),
              ip: req.ip,
              userId: req['user']?.id,
            });
          }
        } catch {
          // Ignore analytics errors to not affect main request
        }
      }, 0);

      return originalSend.call(this, data);
    };

    next();
  }

  private extractApiVersion(req: Request): string | null {
    // 1. Check X-API-Version header
    let version = req.headers['x-api-version'] as string;
    if (version) {
      return this.normalizeVersion(version);
    }

    // 2. Check Accept header for version
    const acceptHeader = req.headers.accept;
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(
        /application\/vnd\.api\+json;version=(\d+)/,
      );
      if (versionMatch) {
        return `v${versionMatch[1]}`;
      }
    }

    // 3. Check query parameter
    version = req.query.version as string;
    if (version) {
      return this.normalizeVersion(version);
    }

    // 4. Check URL path
    const pathMatch = req.path.match(/^\/api\/v(\d+)/);
    if (pathMatch) {
      return `v${pathMatch[1]}`;
    }

    return null;
  }

  private normalizeVersion(version: string): string {
    // Remove 'v' prefix if present and add it back
    const cleanVersion = version.replace(/^v/i, '');
    return `v${cleanVersion}`;
  }
}

@Injectable()
export class AdvancedRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AdvancedRateLimitMiddleware.name);
  private requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(private readonly apiGatewayService: ApiGatewayService) {
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanupOldEntries(), 5 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.generateRateLimitKey(req);
    const config = this.getRateLimitConfig(req);

    const now = Date.now();

    // Get or create request count for this key
    let requestData = this.requestCounts.get(key);

    if (!requestData || requestData.resetTime <= now) {
      // Create new window
      requestData = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }

    requestData.count++;
    this.requestCounts.set(key, requestData);

    // Check if limit exceeded
    if (requestData.count > config.max) {
      const retryAfter = Math.ceil((requestData.resetTime - now) / 1000);

      this.logger.warn(
        `Rate limit exceeded for key: ${key}, limit: ${config.max}`,
      );

      res.setHeader('X-RateLimit-Limit', config.max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', requestData.resetTime.toString());
      res.setHeader('Retry-After', retryAfter.toString());

      return res.status(429).json({
        error: 'Too Many Requests',
        message: config.message,
        retryAfter,
      });
    }

    // Set rate limit headers
    const remaining = Math.max(0, config.max - requestData.count);
    res.setHeader('X-RateLimit-Limit', config.max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', requestData.resetTime.toString());

    next();
  }

  private generateRateLimitKey(req: Request): string {
    const userType = this.getUserType(req);
    const endpoint = this.getEndpointPattern(req);
    const identifier = req['user']?.id || req.ip;

    return `${userType}:${endpoint}:${identifier}`;
  }

  private getUserType(req: Request): string {
    if (!req['user']) {
      return 'anonymous';
    }

    const user = req['user'];
    if (user.role === 'admin') {
      return 'admin';
    }
    if (user.isPremium) {
      return 'premium';
    }
    return 'user';
  }

  private getEndpointPattern(req: Request): string {
    const path = req.path;

    // Map specific endpoints to their patterns
    if (path.includes('/auth/login')) return '/auth/login';
    if (path.includes('/auth/register')) return '/auth/register';
    if (path.includes('/payment')) return '/payment';
    if (path.includes('/tickets/generate')) return '/tickets/generate';

    // Generic pattern for other endpoints
    return path.split('/')[1] || 'general';
  }

  private getRateLimitConfig(req: Request) {
    const userType = this.getUserType(req);
    const endpoint = this.getEndpointPattern(req);

    // Get endpoint-specific limits first
    const endpointConfig =
      this.apiGatewayService.getEndpointRateLimit(endpoint);
    if (endpointConfig) {
      return endpointConfig;
    }

    // Fall back to user type limits
    return this.apiGatewayService.getRateLimitConfig(userType);
  }

  private cleanupOldEntries() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, data] of this.requestCounts.entries()) {
      if (data.resetTime <= now) {
        this.requestCounts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} old rate limit entries`);
    }
  }
}

@Injectable()
export class RequestTransformationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestTransformationMiddleware.name);

  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const apiVersion = req['apiVersion'];

    if (!apiVersion) {
      return next();
    }

    // Transform request body based on API version
    if (req.body && Object.keys(req.body).length > 0) {
      try {
        req.body = this.apiGatewayService.transformRequest(
          req.body,
          apiVersion,
          'v3', // Transform to latest internal version
        );
      } catch (error) {
        this.logger.error(`Request transformation failed: ${error.message}`);
        return res.status(400).json({
          error: 'Request transformation failed',
          message: 'Invalid request format for API version',
        });
      }
    }

    // Transform response based on API version
    const originalJson = res.json;
    res.json = function (data) {
      try {
        const transformedData = req.app
          .get('ApiGatewayService')
          .transformResponse(data, 'v3', apiVersion);
        return originalJson.call(this, transformedData);
      } catch {
        return originalJson.call(this, data);
      }
    };

    next();
  }
}
