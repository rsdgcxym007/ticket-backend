import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

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
    const types: any[] = [String, Boolean, Number, Array, Object];
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
        if (Object.prototype.hasOwnProperty.call(value, key)) {
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

    // Remove potential XSS
    let sanitized = DOMPurify.sanitize(input);

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
      /(--|\/\*|\*\/|;|'|"|`)/g,
      /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/gi,
      /(\bor\b|\band\b)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/gi,
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

      // Check for executable content
      if (this.containsExecutableContent(value.buffer)) {
        this.logger.warn('Executable content detected in uploaded file');
        throw new BadRequestException('File contains executable content');
      }
    }

    return value;
  }

  private containsExecutableContent(buffer: Buffer): boolean {
    const executableSignatures = [
      Buffer.from([0x4d, 0x5a]), // PE files (Windows)
      Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF files (Linux)
      Buffer.from([0xfe, 0xed, 0xfa, 0xce]), // Mach-O files (macOS)
      Buffer.from([0xce, 0xfa, 0xed, 0xfe]), // Mach-O files (macOS)
      Buffer.from('#!/bin/'), // Shell scripts
      Buffer.from('<?php'), // PHP scripts
      Buffer.from('<script'), // HTML/JS scripts
    ];

    return executableSignatures.some(
      (signature) => buffer.indexOf(signature) !== -1,
    );
  }
}
