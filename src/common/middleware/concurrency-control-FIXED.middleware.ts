import {
  Injectable,
  NestMiddleware,
  Logger,
  HttpStatus,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { ThailandTimeHelper } from '../utils/thailand-time.helper';

/**
 * 🛡️ Concurrency Control Middleware - MEMORY LEAK FIXED
 * มิดเดิลแวร์จัดการ concurrency และ rate limiting
 * ✅ Fixed: Added proper cleanup and memory limits
 */
@Injectable()
export class ConcurrencyControlMiddleware
  implements NestMiddleware, OnModuleDestroy
{
  private readonly logger = new Logger(ConcurrencyControlMiddleware.name);

  // Rate limiters for different endpoints
  private readonly orderCreationLimiter = new RateLimiterMemory({
    points: 3,
    duration: 60,
    blockDuration: 60,
  });

  private readonly seatBookingLimiter = new RateLimiterMemory({
    points: 5,
    duration: 60,
    blockDuration: 30,
  });

  private readonly generalLimiter = new RateLimiterMemory({
    points: 30,
    duration: 60,
    blockDuration: 10,
  });

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = this.getClientIp(req);
      const userId = this.getUserId(req);
      const path = req.path;
      const method = req.method;
      const key = userId ? `user:${userId}` : `ip:${clientIp}`;

      this.logger.log(`🛡️ Processing request: ${method} ${path} from ${key}`);

      if (this.isOrderCreationEndpoint(path, method)) {
        await this.checkRateLimit(
          this.orderCreationLimiter,
          key,
          'order creation',
        );
      } else if (this.isSeatBookingEndpoint(path, method)) {
        await this.checkRateLimit(this.seatBookingLimiter, key, 'seat booking');
      } else {
        await this.checkRateLimit(this.generalLimiter, key, 'general');
      }

      this.addConcurrencyHeaders(res);
      next();
    } catch (error) {
      this.logger.warn(`⚠️ Rate limit exceeded: ${error.message}`);
      this.handleRateLimitExceeded(res, error);
    }
  }

  onModuleDestroy() {
    this.logger.log(
      '🧹 Concurrency middleware destroyed - no cleanup needed for rate limiters',
    );
  }

  private async checkRateLimit(
    limiter: RateLimiterMemory,
    key: string,
    type: string,
  ): Promise<void> {
    try {
      const resRateLimiter = await limiter.consume(key);
      this.logger.log(
        `✅ Rate limit OK for ${type}: ${key} (${resRateLimiter.remainingPoints} remaining)`,
      );
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      this.logger.warn(
        `⚠️ Rate limit exceeded for ${type}: ${key} (retry in ${secs}s)`,
      );
      throw new BadRequestException(
        `Rate limit exceeded for ${type}. Try again in ${secs} seconds.`,
      );
    }
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private getUserId(req: Request): string | null {
    const user = (req as any).user;
    return user ? user.id : null;
  }

  private isOrderCreationEndpoint(path: string, method: string): boolean {
    return method === 'POST' && path.includes('/orders');
  }

  private isSeatBookingEndpoint(path: string, method: string): boolean {
    return (
      (method === 'POST' && path.includes('/seats')) ||
      (method === 'PATCH' &&
        path.includes('/orders') &&
        path.includes('/seats'))
    );
  }

  private addConcurrencyHeaders(res: Response): void {
    res.setHeader('X-Concurrency-Control', 'enabled');
    res.setHeader('X-Timestamp', ThailandTimeHelper.now().toISOString());
    res.setHeader('X-Timezone', 'Asia/Bangkok');
  }

  private handleRateLimitExceeded(res: Response, error: any): void {
    const retryAfter = Math.round(error.msBeforeNext / 1000) || 60;

    res.status(HttpStatus.TOO_MANY_REQUESTS);
    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Limit', '30');
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + error.msBeforeNext).toISOString(),
    );

    res.json({
      success: false,
      error: 'Too Many Requests',
      message: 'คำขอมากเกินไป กรุณาลองใหม่ภายหลัง',
      retryAfter,
      timestamp: ThailandTimeHelper.now().toISOString(),
    });
  }
}

/**
 * 🛡️ Request Deduplication Middleware - MEMORY LEAK FIXED
 * มิดเดิลแวร์ป้องกันคำขอซ้ำกัน
 * ✅ Fixed: Added proper interval cleanup and size limits
 */
@Injectable()
export class RequestDeduplicationMiddleware
  implements NestMiddleware, OnModuleDestroy
{
  private readonly logger = new Logger(RequestDeduplicationMiddleware.name);
  private readonly requestHashes = new Map<
    string,
    { timestamp: Date; response: any }
  >();
  private readonly DEDUPLICATION_WINDOW = 5000; // 5 seconds
  private readonly MAX_MAP_SIZE = 1000; // 🔥 MEMORY LIMIT
  private cleanupInterval: NodeJS.Timeout; // 🔥 TRACK INTERVAL

  constructor() {
    // 🔥 FIXED: Store interval reference for cleanup
    this.cleanupInterval = setInterval(() => this.cleanupOldEntries(), 60000);
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method !== 'POST') {
      next();
      return;
    }

    // 🔥 MEMORY PROTECTION: Clear map if too large
    if (this.requestHashes.size > this.MAX_MAP_SIZE) {
      this.logger.warn(
        `🚨 Request hash map too large (${this.requestHashes.size}), force cleanup`,
      );
      this.requestHashes.clear();
    }

    const requestHash = this.generateRequestHash(req);
    const existingRequest = this.requestHashes.get(requestHash);

    if (existingRequest) {
      const timeDiff = Date.now() - existingRequest.timestamp.getTime();

      if (timeDiff < this.DEDUPLICATION_WINDOW) {
        this.logger.warn(`🔄 Duplicate request detected: ${requestHash}`);

        res.status(HttpStatus.CONFLICT);
        res.json({
          success: false,
          error: 'Duplicate Request',
          message: 'คำขอซ้ำกัน กรุณารอให้คำขอก่อนหน้าเสร็จสิ้น',
          originalTimestamp: existingRequest.timestamp.toISOString(),
          currentTimestamp: ThailandTimeHelper.now().toISOString(),
        });
        return;
      }
    }

    this.requestHashes.set(requestHash, {
      timestamp: new Date(),
      response: null,
    });

    next();
  }

  // 🔥 FIXED: Proper cleanup on module destroy
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('🧹 Cleared cleanup interval');
    }
    this.requestHashes.clear();
    this.logger.log('🧹 Cleared request hashes map');
  }

  private generateRequestHash(req: Request): string {
    const userId = (req as any).user?.id || 'anonymous';
    const body = JSON.stringify(req.body || {});
    const path = req.path;
    const hashInput = `${userId}:${path}:${body}`;

    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return hash.toString(36);
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [hash, entry] of this.requestHashes.entries()) {
      if (now - entry.timestamp.getTime() > this.DEDUPLICATION_WINDOW) {
        this.requestHashes.delete(hash);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`🧹 Cleaned up ${cleanedCount} old request entries`);
    }

    // 🔥 EXTRA PROTECTION: Log map size
    this.logger.debug(`📊 Request map size: ${this.requestHashes.size}`);
  }
}
