import {
  Injectable,
  NestMiddleware,
  Logger,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { ThailandTimeHelper } from '../utils/thailand-time.helper';

/**
 * 🛡️ Concurrency Control Middleware
 * มิดเดิลแวร์จัดการ concurrency และ rate limiting
 */
@Injectable()
export class ConcurrencyControlMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ConcurrencyControlMiddleware.name);

  // Rate limiters for different endpoints
  private readonly orderCreationLimiter = new RateLimiterMemory({
    points: 3, // 3 requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds
  });

  private readonly seatBookingLimiter = new RateLimiterMemory({
    points: 5, // 5 requests
    duration: 60, // Per 60 seconds
    blockDuration: 30, // Block for 30 seconds
  });

  private readonly generalLimiter = new RateLimiterMemory({
    points: 30, // 30 requests
    duration: 60, // Per 60 seconds
    blockDuration: 10, // Block for 10 seconds
  });

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = this.getClientIp(req);
      const userId = this.getUserId(req);
      const path = req.path;
      const method = req.method;

      // Create unique key for rate limiting
      const key = userId ? `user:${userId}` : `ip:${clientIp}`;

      this.logger.log(`🛡️ Processing request: ${method} ${path} from ${key}`);

      // Apply specific rate limiting based on endpoint
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

      // Add concurrency headers
      this.addConcurrencyHeaders(res);

      next();
    } catch (error) {
      this.logger.warn(`⚠️ Rate limit exceeded: ${error.message}`);
      this.handleRateLimitExceeded(res, error);
    }
  }

  /**
   * 🔍 Check rate limit
   * ตรวจสอบ rate limit
   */
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

  /**
   * 🌐 Get client IP
   * ได้ IP address ของ client
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 👤 Get user ID from request
   * ได้ user ID จาก request
   */
  private getUserId(req: Request): string | null {
    // Extract user ID from JWT token or session
    const user = (req as any).user;
    return user ? user.id : null;
  }

  /**
   * 🎫 Check if endpoint is order creation
   * ตรวจสอบว่าเป็น endpoint สำหรับสร้างออเดอร์หรือไม่
   */
  private isOrderCreationEndpoint(path: string, method: string): boolean {
    return method === 'POST' && path.includes('/orders');
  }

  /**
   * 🪑 Check if endpoint is seat booking
   * ตรวจสอบว่าเป็น endpoint สำหรับจองที่นั่งหรือไม่
   */
  private isSeatBookingEndpoint(path: string, method: string): boolean {
    return (
      (method === 'POST' && path.includes('/seats')) ||
      (method === 'PATCH' &&
        path.includes('/orders') &&
        path.includes('/seats'))
    );
  }

  /**
   * 📝 Add concurrency headers
   * เพิ่มส่วนหัวเกี่ยวกับ concurrency
   */
  private addConcurrencyHeaders(res: Response): void {
    res.setHeader('X-Concurrency-Control', 'enabled');
    res.setHeader('X-Timestamp', ThailandTimeHelper.now().toISOString());
    res.setHeader('X-Timezone', 'Asia/Bangkok');
  }

  /**
   * 🚫 Handle rate limit exceeded
   * จัดการเมื่อเกิน rate limit
   */
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
 * 🛡️ Request Deduplication Middleware
 * มิดเดิลแวร์ป้องกันคำขอซ้ำกัน
 */
@Injectable()
export class RequestDeduplicationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestDeduplicationMiddleware.name);
  private readonly requestHashes = new Map<
    string,
    { timestamp: Date; response: any }
  >();
  private readonly DEDUPLICATION_WINDOW = 5000; // 5 seconds

  constructor() {
    // Clean up old entries every minute
    setInterval(() => this.cleanupOldEntries(), 60000);
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Only apply deduplication to POST requests
    if (req.method !== 'POST') {
      next();
      return;
    }

    const requestHash = this.generateRequestHash(req);
    const existingRequest = this.requestHashes.get(requestHash);

    if (existingRequest) {
      const timeDiff = Date.now() - existingRequest.timestamp.getTime();

      if (timeDiff < this.DEDUPLICATION_WINDOW) {
        this.logger.warn(`🔄 Duplicate request detected: ${requestHash}`);

        // Return cached response
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

    // Store request
    this.requestHashes.set(requestHash, {
      timestamp: new Date(),
      response: null,
    });

    // Continue with request
    next();
  }

  /**
   * 🔑 Generate request hash
   * สร้าง hash ของคำขอ
   */
  private generateRequestHash(req: Request): string {
    const userId = (req as any).user?.id || 'anonymous';
    const body = JSON.stringify(req.body || {});
    const path = req.path;

    // Create hash based on user, path, and body
    const hashInput = `${userId}:${path}:${body}`;

    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  /**
   * 🧹 Cleanup old entries
   * ทำความสะอาดรายการเก่า
   */
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
  }
}
