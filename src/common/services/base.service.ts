// ========================================
// 🏗️ CORE SERVICE LAYER
// ========================================

import { Injectable, Logger } from '@nestjs/common';
import {
  Repository,
  FindOptionsWhere,
  Between,
  Like,
  DeepPartial,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

// Types
import { ApiResponse, PaginatedResponse, ValidationError } from '../types';

// Entities
import { AuditLog } from '../../audit/audit-log.entity';

// Validation
import { ValidationHelper } from '../validation';

// Enums
import { AuditAction } from '../enums';

// ========================================
// 📋 BASE SERVICE CLASS
// ========================================

@Injectable()
export abstract class BaseService<T> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly configService: ConfigService,
    @InjectRepository(AuditLog)
    protected readonly auditRepo: Repository<AuditLog>,
  ) {}

  // ========================================
  // 📊 COMMON CRUD OPERATIONS
  // ========================================

  async findAll(
    page: number = 1,
    limit: number = 10,
    where?: FindOptionsWhere<T>,
    relations?: string[],
  ): Promise<PaginatedResponse<T>> {
    const take = Math.min(limit, 100); // Max 100 items per page
    const skip = (page - 1) * take;

    const [data, total] = await this.repository.findAndCount({
      where,
      relations,
      take,
      skip,
      order: { createdAt: 'DESC' } as any,
    });

    return {
      data,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
        hasNext: page < Math.ceil(total / take),
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string, relations?: string[]): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as any,
      relations,
    });
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string, data: any): Promise<T | null> {
    await this.repository.update(id, data as any);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  // ========================================
  // 🔍 SEARCH OPERATIONS
  // ========================================

  async search(
    searchTerm: string,
    searchFields: string[],
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<T>> {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const whereConditions = searchFields.map((field) => ({
      [field]: Like(`%${searchTerm}%`),
    }));

    const [data, total] = await this.repository.findAndCount({
      where: whereConditions as any,
      take,
      skip,
      order: { createdAt: 'DESC' } as any,
    });

    return {
      data,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
        hasNext: page < Math.ceil(total / take),
        hasPrev: page > 1,
      },
    };
  }

  // ========================================
  // 📈 ANALYTICS OPERATIONS
  // ========================================

  async getCount(where?: FindOptionsWhere<T>): Promise<number> {
    return this.repository.count({ where });
  }

  async getCountByDateRange(
    startDate: Date,
    endDate: Date,
    dateField: string = 'createdAt',
  ): Promise<number> {
    return this.repository.count({
      where: {
        [dateField]: Between(startDate, endDate),
      } as any,
    });
  }

  // ========================================
  // 📝 AUDIT OPERATIONS
  // ========================================

  async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    try {
      const auditLog = this.auditRepo.create({
        userId: userId as string,
        action: action as AuditAction,
      });

      await this.auditRepo.save(auditLog);
      this.logger.log(
        `Audit log created: ${action} on ${entityType} ${entityId} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
    }
  }

  // ========================================
  // 🛡️ VALIDATION OPERATIONS
  // ========================================

  protected validateRequired(
    data: Record<string, any>,
    requiredFields: string[],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    requiredFields.forEach((field) => {
      if (!data[field]) {
        errors.push({
          field,
          message: `${field} is required`,
          code: 'REQUIRED',
        });
      }
    });

    return errors;
  }

  protected validateEmail(email: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!ValidationHelper.isValidEmail(email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    }

    return errors;
  }

  protected validatePhone(phone: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!ValidationHelper.isValidPhone(phone)) {
      errors.push({
        field: 'phone',
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE',
      });
    }

    return errors;
  }

  // ========================================
  // 📦 RESPONSE HELPERS
  // ========================================

  protected createSuccessResponse<U>(
    data: U,
    message: string = 'Operation successful',
  ): ApiResponse<U> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date(),
    };
  }

  protected createErrorResponse(
    message: string,
    errors?: ValidationError[],
  ): ApiResponse {
    return {
      success: false,
      message,
      errors,
      timestamp: new Date(),
    };
  }

  // ========================================
  // 🔧 UTILITY METHODS
  // ========================================

  protected sanitizeInput(input: string): string {
    return ValidationHelper.sanitizeInput(input);
  }

  protected generateReference(prefix: string = 'REF'): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  protected calculateDateDifference(
    startDate: Date,
    endDate: Date,
  ): { days: number; hours: number; minutes: number } {
    const diff = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  }
}
