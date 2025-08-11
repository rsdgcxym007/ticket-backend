import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

interface ErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: any;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const requestId = this.generateRequestId();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined;
    let details: any;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error;
        details = responseObj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      if (!isProduction) {
        details = {
          stack: exception.stack,
        };
      }
    }

    // Create error response
    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Add error details only in development
    if (!isProduction) {
      if (error) errorResponse.error = error;
      if (details) errorResponse.details = details;
    }

    // Log the error
    this.logError(exception, request, requestId, status);

    // Send response
    response.status(status).json(errorResponse);
  }

  private logError(
    exception: unknown,
    request: Request,
    requestId: string,
    status: number,
  ) {
    const errorInfo = {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      statusCode: status,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      // Server errors
      this.logger.error(`🚨 Server Error: ${this.getErrorMessage(exception)}`, {
        ...errorInfo,
        exception: this.getErrorDetails(exception),
      });
    } else if (status >= 400) {
      // Client errors
      this.logger.warn(
        `⚠️ Client Error: ${this.getErrorMessage(exception)}`,
        errorInfo,
      );
    } else {
      // Other errors
      this.logger.log(
        `ℹ️ Error: ${this.getErrorMessage(exception)}`,
        errorInfo,
      );
    }
  }

  private getErrorMessage(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    if (typeof exception === 'string') {
      return exception;
    }
    return 'Unknown error';
  }

  private getErrorDetails(exception: unknown): any {
    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }
    return exception;
  }

  private generateRequestId(): string {
    return (
      Date.now().toString(36) + Math.random().toString(36).substring(2, 15)
    );
  }
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'An error occurred';
    let details: any;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || message;
      details = responseObj;
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (details && details.errors) {
      errorResponse.details = details.errors;
    }

    // Log specific HTTP exceptions
    if (status >= 500) {
      this.logger.error(`HTTP ${status}: ${message}`, {
        path: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.get('User-Agent'),
      });
    } else if (status >= 400) {
      this.logger.warn(`HTTP ${status}: ${message}`, {
        path: request.url,
        method: request.method,
      });
    }

    response.status(status).json(errorResponse);
  }
}
