// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { error as errorResponseHelper } from '../responses';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let error: any = exception;

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const resObj = response as Record<string, any>;
        message = resObj.message || message;
        error = resObj.error || message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.stack || exception.message;
    }

    this.logger.error(
      `❌ ${req.method} ${req.url} → ${status}`,
      exception instanceof Error ? exception.stack : '',
    );

    const resBody = errorResponseHelper(error, message, req, status);

    res.status(status).json(resBody);
  }
}
