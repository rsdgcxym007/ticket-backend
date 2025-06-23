// src/common/responses.ts
import dayjs from 'dayjs';
import { Request } from 'express';

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
      timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
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
      timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    }),
  };
}
