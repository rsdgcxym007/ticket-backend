// ========================================
// 🎯 LOGGING HELPER - ฟังก์ชันสำหรับจัดการ Logging
// ========================================

import { Logger } from '@nestjs/common';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  [key: string]: any;
}

export interface PerformanceLog {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class LoggingHelper {
  /**
   * 🎯 สร้าง Logger ที่มี Context
   */
  static createContextLogger(
    context: string,
    additionalContext?: LogContext,
  ): Logger & {
    logWithContext: (level: string, message: string, extra?: any) => void;
  } {
    const logger = new Logger(context);

    const logWithContext = (level: string, message: string, extra?: any) => {
      const logMessage = LoggingHelper.formatMessage(
        message,
        additionalContext,
        extra,
      );

      switch (level.toLowerCase()) {
        case 'debug':
          logger.debug(logMessage);
          break;
        case 'verbose':
          logger.verbose(logMessage);
          break;
        case 'log':
          logger.log(logMessage);
          break;
        case 'warn':
          logger.warn(logMessage);
          break;
        case 'error':
          logger.error(logMessage);
          break;
        default:
          logger.log(logMessage);
      }
    };

    return Object.assign(logger, { logWithContext });
  }

  /**
   * 🎯 จัดรูปแบบ Log Message
   */
  static formatMessage(
    message: string,
    context?: LogContext,
    extra?: any,
  ): string {
    const parts = [message];

    if (context) {
      const contextParts = [];

      if (context.userId) contextParts.push(`user:${context.userId}`);
      if (context.sessionId)
        contextParts.push(`session:${context.sessionId.slice(0, 8)}`);
      if (context.requestId)
        contextParts.push(`req:${context.requestId.slice(0, 8)}`);
      if (context.method && context.url)
        contextParts.push(`${context.method} ${context.url}`);
      if (context.ip) contextParts.push(`ip:${context.ip}`);

      if (contextParts.length > 0) {
        parts.push(`[${contextParts.join(' | ')}]`);
      }
    }

    if (extra) {
      if (typeof extra === 'object') {
        parts.push(JSON.stringify(extra, null, 2));
      } else {
        parts.push(String(extra));
      }
    }

    return parts.join(' ');
  }

  /**
   * 🎯 Log API Request/Response
   */
  static logApiCall(
    logger: Logger,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ): void {
    const emoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    const message = `${emoji} ${method} ${url} - ${statusCode} (${duration}ms)`;

    logger.log(this.formatMessage(message, context));
  }

  /**
   * 🎯 Log Database Query
   */
  static logDbQuery(
    logger: Logger,
    operation: string,
    table: string,
    duration: number,
    recordsAffected?: number,
    context?: LogContext,
  ): void {
    const message = `🗄️ DB ${operation} on ${table} (${duration}ms)${
      recordsAffected !== undefined ? ` - ${recordsAffected} records` : ''
    }`;

    logger.debug(this.formatMessage(message, context));
  }

  /**
   * 🎯 Log Performance Metrics
   */
  static logPerformance(
    logger: Logger,
    operation: string,
    startTime: number,
    metadata?: Record<string, any>,
    context?: LogContext,
  ): void {
    const duration = Date.now() - startTime;
    const message = `⚡ Performance: ${operation} completed in ${duration}ms`;

    logger.log(this.formatMessage(message, context, metadata));
  }

  /**
   * 🎯 Log Business Logic Events
   */
  static logBusinessEvent(
    logger: Logger,
    event: string,
    details: Record<string, any>,
    context?: LogContext,
  ): void {
    const message = `📊 Business Event: ${event}`;
    logger.log(this.formatMessage(message, context, details));
  }

  /**
   * 🎯 Log Security Events
   */
  static logSecurityEvent(
    logger: Logger,
    event: string,
    details: Record<string, any>,
    context?: LogContext,
  ): void {
    const message = `🔒 Security Event: ${event}`;
    logger.warn(this.formatMessage(message, context, details));
  }

  /**
   * 🎯 Log Error with Stack Trace
   */
  static logError(
    logger: Logger,
    error: Error,
    context?: LogContext,
    additionalDetails?: Record<string, any>,
  ): void {
    const message = `💥 Error: ${error.message}`;
    const details = {
      stack: error.stack,
      name: error.name,
      ...additionalDetails,
    };

    logger.error(this.formatMessage(message, context, details));
  }

  /**
   * 🎯 Create Performance Timer
   */
  static createPerformanceTimer(operation: string): PerformanceLog {
    return {
      operation,
      startTime: Date.now(),
    };
  }

  /**
   * 🎯 End Performance Timer and Log
   */
  static endPerformanceTimer(
    timer: PerformanceLog,
    logger: Logger,
    context?: LogContext,
  ): PerformanceLog {
    timer.endTime = Date.now();
    timer.duration = timer.endTime - timer.startTime;

    this.logPerformance(
      logger,
      timer.operation,
      timer.startTime,
      timer.metadata,
      context,
    );

    return timer;
  }

  /**
   * 🎯 Log with Rate Limiting (to prevent spam)
   */
  private static logCache = new Map<string, number>();

  static logWithRateLimit(
    logger: Logger,
    level: string,
    message: string,
    rateLimit: number = 60000, // 1 minute default
    context?: LogContext,
  ): void {
    const key = `${level}:${message}`;
    const now = Date.now();
    const lastLog = this.logCache.get(key);

    if (!lastLog || now - lastLog > rateLimit) {
      this.logCache.set(key, now);

      const contextLogger = this.createContextLogger('RateLimited', context);
      contextLogger.logWithContext(level, message);
    }
  }

  /**
   * 🎯 Sanitize Sensitive Data for Logging
   */
  static sanitizeForLogging(obj: any): any {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
    ];

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeForLogging(item));
    }

    const sanitized = { ...obj };

    for (const [key, value] of Object.entries(sanitized)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeForLogging(value);
      }
    }

    return sanitized;
  }
}
