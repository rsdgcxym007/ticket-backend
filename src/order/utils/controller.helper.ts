// ========================================
// 🛠️ ORDER CONTROLLER HELPER
// ========================================
// Helper utilities for order controller to reduce complexity

import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { success, error } from '../../common/responses';
import { AuthenticatedRequest } from '../../common/interfaces/auth.interface';

export class OrderControllerHelper {
  /**
   * 🔍 จัดการ error response แบบมาตรฐาน
   */
  static handleServiceError(err: any, req?: AuthenticatedRequest) {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException ||
      err instanceof ConflictException
    ) {
      throw err;
    }

    // Handle legacy error formats
    if (err.status === 400 || err.name === 'BadRequestException') {
      throw new BadRequestException(err.message);
    }
    if (err.status === 404 || err.name === 'NotFoundException') {
      throw new NotFoundException(err.message);
    }
    if (err.status === 409 || err.name === 'ConflictException') {
      throw new ConflictException(err.message);
    }

    // Fallback to generic error
    if (req) {
      return error(err.message, '400', req);
    }
    throw new BadRequestException(err.message);
  }

  /**
   * ✅ สร้าง success response แบบมาตรฐาน
   */
  static createSuccessResponse(
    data: any,
    message: string,
    req: AuthenticatedRequest,
  ) {
    return success(data, message, req);
  }

  /**
   * 🔍 ตรวจสอบผลลัพธ์จาก service
   */
  static validateServiceResult(
    result: any,
    errorMessage: string = 'Operation failed',
  ) {
    if (!result?.success) {
      const message = result?.message || errorMessage;
      throw new BadRequestException(message);
    }
    return result;
  }

  /**
   * 🔄 ดึงข้อมูล order object จาก nested result
   */
  static extractOrderFromResult(result: any) {
    return (result as any).data || (result as any).updatedOrder || result;
  }

  /**
   * 🪑 ตรวจสอบ seats data validity
   */
  static validateSeatsData(orderObj: any): boolean {
    return (
      (Array.isArray(orderObj?.seatIds) && orderObj.seatIds.length > 0) ||
      (Array.isArray(orderObj?.seatBookings) &&
        orderObj.seatBookings.length > 0) ||
      (Array.isArray(orderObj?.seats) && orderObj.seats.length > 0)
    );
  }

  /**
   * 📝 ตรวจสอบ file upload
   */
  static validateFileUpload(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('กรุณาเลือกไฟล์สำหรับ import');
    }

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'ไฟล์ต้องเป็นประเภท CSV หรือ Excel (.csv, .xls, .xlsx)',
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('ไฟล์มีขนาดใหญ่เกิน 10MB');
    }
  }

  /**
   * 🔒 ตรวจสอบ seat lock error
   */
  static handleSeatLockError(err: any, req: AuthenticatedRequest) {
    if (
      err.message.includes('already locked') ||
      err.message.includes('CONFLICT')
    ) {
      return error(err.message, '409', req);
    }
    return error(err.message, '400', req);
  }

  /**
   * 📊 สร้าง pagination response
   */
  static createPaginationResponse(
    result: any,
    message: string,
    req: AuthenticatedRequest,
  ) {
    return success(
      {
        data: Array.isArray(result.items) ? result.items : [],
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
      message,
      req,
    );
  }
}
