import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private helmetMiddleware: any;
  private compressionMiddleware: any;

  constructor(private configService: ConfigService) {
    // Configure Helmet for security headers
    this.helmetMiddleware = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });

    // Configure compression
    this.compressionMiddleware = compression({
      level: 6,
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Add security headers
    this.helmetMiddleware(req, res, (err?: any) => {
      if (err) {
        this.logger.error('Security middleware error:', err);
        return next(err);
      }

      // Add compression
      this.compressionMiddleware(req, res, (compressionErr?: any) => {
        if (compressionErr) {
          this.logger.error('Compression middleware error:', compressionErr);
          return next(compressionErr);
        }

        // Add custom security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=()',
        );

        // Remove sensitive headers
        res.removeHeader('X-Powered-By');
        res.removeHeader('Server');

        // Log suspicious requests
        this.logSuspiciousRequests(req);

        next();
      });
    });
  }

  private logSuspiciousRequests(req: Request) {
    const suspiciousPatterns = [
      /\.env$/i,
      /\/admin$/i,
      /\/wp-admin/i,
      /\/phpMyAdmin/i,
      /\.php$/i,
      /\/config/i,
      /\/backup/i,
      /\.\./,
      /<script/i,
      /javascript:/i,
      /eval\(/i,
      /union.*select/i,
      /drop.*table/i,
    ];

    const userAgent = req.get('User-Agent') || '';
    const path = req.path;
    const method = req.method;

    // Check for suspicious patterns
    const isSuspicious = suspiciousPatterns.some(
      (pattern) => pattern.test(path) || pattern.test(userAgent),
    );

    if (isSuspicious) {
      this.logger.warn(`🚨 Suspicious request detected: ${method} ${path}`, {
        ip: req.ip,
        userAgent,
        path,
        method,
        query: req.query,
        timestamp: new Date().toISOString(),
      });
    }

    // Log large request bodies
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    if (contentLength > 1024 * 1024) {
      // > 1MB
      this.logger.warn(
        `📦 Large request body detected: ${contentLength} bytes`,
        {
          ip: req.ip,
          path,
          method,
          contentLength,
        },
      );
    }
  }
}
