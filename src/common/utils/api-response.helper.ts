// ========================================
// 🎯 API RESPONSE HELPER - ฟังก์ชันสำหรับจัดการ Response API
// ========================================

import { HttpStatus } from '@nestjs/common';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  path?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export class ApiResponseHelper {
  /**
   * 🎯 สร้าง Success Response
   */
  static success<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = HttpStatus.OK,
    meta?: {
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    },
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...(meta && { meta }),
    };
  }

  /**
   * 🎯 สร้าง Error Response
   */
  static error(
    message: string = 'Internal Server Error',
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    error?: string,
    path?: string,
  ): ApiResponse {
    return {
      success: false,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      ...(path && { path }),
    };
  }

  /**
   * 🎯 สร้าง Paginated Response
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Success',
  ): ApiResponse<T[]> {
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message,
      data,
      timestamp: new Date().toISOString(),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * 🎯 สร้าง Created Response
   */
  static created<T>(
    data: T,
    message: string = 'Created successfully',
  ): ApiResponse<T> {
    return this.success(data, message, HttpStatus.CREATED);
  }

  /**
   * 🎯 สร้าง No Content Response
   */
  static noContent(message: string = 'No content'): ApiResponse {
    return {
      success: true,
      statusCode: HttpStatus.NO_CONTENT,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🎯 สร้าง Not Found Response
   */
  static notFound(
    message: string = 'Resource not found',
    path?: string,
  ): ApiResponse {
    return this.error(message, HttpStatus.NOT_FOUND, 'NOT_FOUND', path);
  }

  /**
   * 🎯 สร้าง Bad Request Response
   */
  static badRequest(
    message: string = 'Bad request',
    error?: string,
    path?: string,
  ): ApiResponse {
    return this.error(
      message,
      HttpStatus.BAD_REQUEST,
      error || 'BAD_REQUEST',
      path,
    );
  }

  /**
   * 🎯 สร้าง Unauthorized Response
   */
  static unauthorized(
    message: string = 'Unauthorized',
    path?: string,
  ): ApiResponse {
    return this.error(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', path);
  }

  /**
   * 🎯 สร้าง Forbidden Response
   */
  static forbidden(message: string = 'Forbidden', path?: string): ApiResponse {
    return this.error(message, HttpStatus.FORBIDDEN, 'FORBIDDEN', path);
  }

  /**
   * 🎯 สร้าง Conflict Response
   */
  static conflict(
    message: string = 'Conflict',
    error?: string,
    path?: string,
  ): ApiResponse {
    return this.error(message, HttpStatus.CONFLICT, error || 'CONFLICT', path);
  }

  /**
   * 🎯 สร้าง Too Many Requests Response
   */
  static tooManyRequests(
    message: string = 'Too many requests',
    path?: string,
  ): ApiResponse {
    return this.error(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      'TOO_MANY_REQUESTS',
      path,
    );
  }
}
