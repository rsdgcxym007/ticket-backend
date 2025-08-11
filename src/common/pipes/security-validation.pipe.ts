import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class SecurityValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(SecurityValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return this.sanitizeInput(value);
    }

    // Sanitize input before validation
    const sanitizedValue = this.sanitizeInput(value);

    const object = plainToClass(metatype, sanitizedValue);
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors.map((error) => {
        return Object.values(error.constraints || {}).join(', ');
      });

      this.logger.warn(`Validation failed: ${errorMessages.join('; ')}`);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
        timestamp: new Date().toISOString(),
      });
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeInput(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((item) => this.sanitizeInput(item));
      }

      const sanitized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          const sanitizedKey = this.sanitizeString(key);
          sanitized[sanitizedKey] = this.sanitizeInput(value[key]);
        }
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return input;
    }

    let sanitized = input;

    // Remove potential XSS patterns
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Remove SQL injection patterns
    sanitized = this.removeSQLInjectionPatterns(sanitized);

    // Remove excessive whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    // Limit length to prevent DoS
    if (sanitized.length > 10000) {
      this.logger.warn(`Input truncated: original length ${sanitized.length}`);
      sanitized = sanitized.substring(0, 10000);
    }

    return sanitized;
  }

  private removeSQLInjectionPatterns(input: string): string {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/gi,
    ];

    let sanitized = input;
    sqlPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly logger = new Logger(FileValidationPipe.name);
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
  ];

  transform(value: any) {
    if (!value) {
      return value;
    }

    if (value.buffer) {
      // Validate file size
      if (value.buffer.length > this.maxFileSize) {
        this.logger.warn(`File too large: ${value.buffer.length} bytes`);
        throw new BadRequestException('File size exceeds maximum limit (10MB)');
      }

      // Validate MIME type
      if (!this.allowedMimeTypes.includes(value.mimetype)) {
        this.logger.warn(`Invalid file type: ${value.mimetype}`);
        throw new BadRequestException(
          `File type not allowed: ${value.mimetype}`,
        );
      }
    }

    return value;
  }
}
