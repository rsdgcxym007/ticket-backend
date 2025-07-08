// src/common/responses.ts
import { Request } from 'express';
import { ThailandTimeHelper } from './utils/thailand-time.helper';

export function success(
  data: any,
  message = 'success',
  req?: Request,
  statusCode = 200,
) {
  return {
    statusCode,
    message,
    data,
    ...(req && {
      method: req.method,
      path: req.originalUrl,
      timestamp: ThailandTimeHelper.formatDateTime(
        ThailandTimeHelper.now(),
        'YYYY-MM-DDTHH:mm:ss',
      ),
    }),
  };
}

export function error(
  error: any,
  message = 'error',
  req?: Request,
  statusCode = 400,
) {
  return {
    statusCode,
    message,
    error,
    ...(req && {
      method: req.method,
      path: req.originalUrl,
      timestamp: ThailandTimeHelper.formatDateTime(
        ThailandTimeHelper.now(),
        'YYYY-MM-DDTHH:mm:ss',
      ),
    }),
  };
}
