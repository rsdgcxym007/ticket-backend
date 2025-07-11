// ========================================
// 🎯 ERROR HANDLING HELPER - ฟังก์ชันสำหรับจัดการ Error
// ========================================

import {
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  stack?: string;
  timestamp: string;
  context?: ErrorContext;
}

export class ErrorHandlingHelper {
  private static readonly logger = new Logger(ErrorHandlingHelper.name);

  /**
   * 🎯 สร้าง Custom Error
   */
  static createError(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    code?: string,
    details?: any,
  ): HttpException {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return new BadRequestException({
          message,
          code: code || 'BAD_REQUEST',
          details,
          timestamp: new Date().toISOString(),
        });
      case HttpStatus.UNAUTHORIZED:
        return new UnauthorizedException({
          message,
          code: code || 'UNAUTHORIZED',
          details,
          timestamp: new Date().toISOString(),
        });
      case HttpStatus.FORBIDDEN:
        return new ForbiddenException({
          message,
          code: code || 'FORBIDDEN',
          details,
          timestamp: new Date().toISOString(),
        });
      case HttpStatus.NOT_FOUND:
        return new NotFoundException({
          message,
          code: code || 'NOT_FOUND',
          details,
          timestamp: new Date().toISOString(),
        });
      case HttpStatus.CONFLICT:
        return new ConflictException({
          message,
          code: code || 'CONFLICT',
          details,
          timestamp: new Date().toISOString(),
        });
      default:
        return new InternalServerErrorException({
          message,
          code: code || 'INTERNAL_SERVER_ERROR',
          details,
          timestamp: new Date().toISOString(),
        });
    }
  }

  /**
   * 🎯 Handle Database Errors
   */
  static handleDatabaseError(
    error: any,
    context?: ErrorContext,
  ): HttpException {
    this.logger.error('Database error occurred:', {
      error: error.message,
      code: error.code,
      context,
    });

    // PostgreSQL Error Codes
    switch (error.code) {
      case '23505': // Unique violation
        return this.createError(
          'Resource already exists',
          HttpStatus.CONFLICT,
          'DUPLICATE_ENTRY',
          { field: this.extractDuplicateField(error.detail) },
        );
      case '23503': // Foreign key violation
        return this.createError(
          'Referenced resource not found',
          HttpStatus.BAD_REQUEST,
          'FOREIGN_KEY_VIOLATION',
        );
      case '23502': // Not null violation
        return this.createError(
          'Required field is missing',
          HttpStatus.BAD_REQUEST,
          'REQUIRED_FIELD_MISSING',
          { field: error.column },
        );
      case '42P01': // Undefined table
        return this.createError(
          'Database table not found',
          HttpStatus.INTERNAL_SERVER_ERROR,
          'TABLE_NOT_FOUND',
        );
      case 'ECONNREFUSED':
        return this.createError(
          'Database connection failed',
          HttpStatus.SERVICE_UNAVAILABLE,
          'DATABASE_UNAVAILABLE',
        );
      default:
        return this.createError(
          'Database operation failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
          'DATABASE_ERROR',
          { originalError: error.message },
        );
    }
  }

  /**
   * 🎯 Handle Business Logic Errors
   */
  static handleBusinessError(
    error: any,
    operation: string,
    context?: ErrorContext,
  ): HttpException {
    this.logger.warn('Business logic error:', {
      operation,
      error: error.message,
      context,
    });

    if (error instanceof HttpException) {
      return error;
    }

    // Define business error patterns
    const businessErrors = [
      {
        pattern: /insufficient.*balance/i,
        status: HttpStatus.BAD_REQUEST,
        code: 'INSUFFICIENT_BALANCE',
      },
      {
        pattern: /seat.*not.*available/i,
        status: HttpStatus.CONFLICT,
        code: 'SEAT_NOT_AVAILABLE',
      },
      {
        pattern: /order.*expired/i,
        status: HttpStatus.BAD_REQUEST,
        code: 'ORDER_EXPIRED',
      },
      {
        pattern: /payment.*failed/i,
        status: HttpStatus.PAYMENT_REQUIRED,
        code: 'PAYMENT_FAILED',
      },
      {
        pattern: /quota.*exceeded/i,
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: 'QUOTA_EXCEEDED',
      },
    ];

    for (const businessError of businessErrors) {
      if (businessError.pattern.test(error.message)) {
        return this.createError(
          error.message,
          businessError.status,
          businessError.code,
        );
      }
    }

    return this.createError(
      error.message || 'Business operation failed',
      HttpStatus.BAD_REQUEST,
      'BUSINESS_ERROR',
    );
  }

  /**
   * 🎯 Handle Validation Errors
   */
  static handleValidationError(validationErrors: any[]): HttpException {
    const errors = validationErrors.map((error) => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
    }));

    return this.createError(
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      { errors },
    );
  }

  /**
   * 🎯 Handle Rate Limiting Errors
   */
  static handleRateLimitError(
    limit: number,
    windowMs: number,
    context?: ErrorContext,
  ): HttpException {
    this.logger.warn('Rate limit exceeded:', { limit, windowMs, context });

    return this.createError(
      `Too many requests. Limit: ${limit} per ${windowMs / 1000} seconds`,
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
      { limit, windowMs },
    );
  }

  /**
   * 🎯 Handle Authentication Errors
   */
  static handleAuthError(error: any, context?: ErrorContext): HttpException {
    this.logger.warn('Authentication error:', {
      error: error.message,
      context,
    });

    const authErrors = [
      {
        pattern: /invalid.*token/i,
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
      },
      {
        pattern: /token.*expired/i,
        message: 'Authentication token has expired',
        code: 'TOKEN_EXPIRED',
      },
      {
        pattern: /invalid.*credentials/i,
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS',
      },
      {
        pattern: /account.*locked/i,
        message: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
      },
    ];

    for (const authError of authErrors) {
      if (authError.pattern.test(error.message)) {
        return this.createError(
          authError.message,
          HttpStatus.UNAUTHORIZED,
          authError.code,
        );
      }
    }

    return this.createError(
      'Authentication failed',
      HttpStatus.UNAUTHORIZED,
      'AUTH_FAILED',
    );
  }

  /**
   * 🎯 Log and Transform Error
   */
  static logAndTransformError(
    error: any,
    operation: string,
    context?: ErrorContext,
  ): HttpException {
    const errorDetails: ErrorDetails = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      statusCode: error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      details: error.details,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
    };

    // Log based on severity
    if (errorDetails.statusCode >= 500) {
      this.logger.error(`❌ ${operation} failed:`, errorDetails);
    } else if (errorDetails.statusCode >= 400) {
      this.logger.warn(`⚠️ ${operation} client error:`, {
        ...errorDetails,
        stack: undefined, // Don't log stack for client errors
      });
    }

    // Return appropriate exception
    if (error instanceof HttpException) {
      return error;
    }

    return this.createError(
      errorDetails.message,
      errorDetails.statusCode,
      errorDetails.code,
      errorDetails.details,
    );
  }

  /**
   * 🎯 Create Error Response for API
   */
  static createErrorResponse(
    error: HttpException,
    path?: string,
  ): {
    success: boolean;
    statusCode: number;
    message: string;
    error: string;
    timestamp: string;
    path?: string;
  } {
    const response = error.getResponse();
    const statusCode = error.getStatus();

    let message = 'Internal Server Error';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null) {
      const resp = response as any;
      message = resp.message || message;
      errorCode = resp.code || errorCode;
    }

    return {
      success: false,
      statusCode,
      message,
      error: errorCode,
      timestamp: new Date().toISOString(),
      ...(path && { path }),
    };
  }

  /**
   * 🎯 Extract Duplicate Field from PostgreSQL Error
   */
  private static extractDuplicateField(detail: string): string {
    if (!detail) return 'unknown';

    const match = detail.match(/Key \(([^)]+)\)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * 🎯 Is Retryable Error
   */
  static isRetryableError(error: any): boolean {
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EAI_AGAIN',
      'ENOTFOUND',
    ];

    const retryableHttpCodes = [
      HttpStatus.REQUEST_TIMEOUT,
      HttpStatus.TOO_MANY_REQUESTS,
      HttpStatus.INTERNAL_SERVER_ERROR,
      HttpStatus.BAD_GATEWAY,
      HttpStatus.SERVICE_UNAVAILABLE,
      HttpStatus.GATEWAY_TIMEOUT,
    ];

    return (
      retryableCodes.includes(error.code) ||
      retryableHttpCodes.includes(error.statusCode) ||
      retryableHttpCodes.includes(error.status)
    );
  }

  /**
   * 🎯 Retry Function with Exponential Backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context?: ErrorContext,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, {
          error: error.message,
          context,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
