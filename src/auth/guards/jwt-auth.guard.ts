import {
  Injectable,
  Logger,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from '../session.service';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(@Optional() private readonly sessionService: SessionService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('=== JwtAuthGuard canActivate START ===');
    console.log('Calling super.canActivate...');

    try {
      // เรียก parent guard ก่อน
      const canActivate = await super.canActivate(context);
      console.log('super.canActivate result:', canActivate);

      if (!canActivate) {
        console.log('super.canActivate returned false');
        return false;
      }

      console.log('JWT validation passed, checking session...');
      const request = context.switchToHttp().getRequest();
      console.log('User in request after JWT validation:', request.user);

      // ถ้า sessionService ไม่ available ให้ยอมรับเฉพาะ JWT validation จาก parent guard
      if (!this.sessionService) {
        this.logger.warn(
          'SessionService not available, skipping session validation',
        );
        console.log('=== JwtAuthGuard canActivate END (no session service) ===');
        return true;
      }

      // 🚨 TEMPORARY: ปิดการใช้งาน session validation ชั่วคราว
      console.log('⚠️ TEMPORARY: Skipping session validation for debugging');
      this.logger.warn('TEMPORARY: Session validation disabled for debugging');
      console.log('=== JwtAuthGuard canActivate END (session validation disabled) ===');
      return true;

      // ตรวจสอบ session
      const token = this.extractTokenFromHeader(request);

      if (!token) {
        console.log('❌ No token found in request');
        this.logger.warn('No token found in request headers');
        return true; // ให้ผ่านไปยัง JWT strategy validation
      }

      // ดึง token ID และสร้าง hash
      const tokenId = this.sessionService.getTokenIdFromToken(token);
      if (!tokenId) {
        console.log('❌ Invalid token format - no tokenId');
        this.logger.warn('Invalid token format - no tokenId found');
        return true; // ให้ผ่านไปยัง JWT strategy validation
      }

      const tokenHash = this.sessionService.createTokenHash(token);
      console.log('🔐 Session validation - Token ID:', tokenId);
      console.log(
        '🔐 Session validation - Token Hash:',
        tokenHash.substring(0, 16) + '...',
      );

      try {
        // ตรวจสอบ session
        const session = await this.sessionService.validateSession(
          tokenId,
          tokenHash,
        );
        
        if (!session) {
          console.log('❌ Session not found or expired');
          this.logger.warn(`Session not found or expired for tokenId: ${tokenId}`);
          // แทนที่จะ throw error ให้ทำการ revoke token แล้วส่ง 401
          throw new UnauthorizedException('Session expired or invalid');
        }

        console.log('✅ Session validation passed:', session.id);
        // เพิ่ม session ข้อมูลไปใน request
        request.session = session;

        console.log(
          '=== JwtAuthGuard canActivate END (session validation passed) ===',
        );
        return true;
      } catch (sessionError) {
        console.log('❌ Session validation failed:', sessionError.message);
        this.logger.error(`Session validation failed: ${sessionError.message}`, {
          tokenId,
          error: sessionError,
        });
        
        // ตรวจสอบว่าเป็น UnauthorizedException หรือไม่
        if (sessionError instanceof UnauthorizedException) {
          throw sessionError;
        }
        
        // สำหรับ error อื่น ๆ ให้ log แล้วส่ง 401
        throw new UnauthorizedException('Session validation failed');
      }
    } catch (error) {
      console.log('❌ JwtAuthGuard error:', error.message);
      this.logger.error(`JwtAuthGuard error: ${error.message}`, {
        error,
        stack: error.stack,
      });
      
      // ถ้าเป็น UnauthorizedException ให้ผ่านต่อไป
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // สำหรับ error อื่น ๆ
      throw new UnauthorizedException('Authentication failed');
    }
  }

  handleRequest(err, user, info, context) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      this.logger.warn(
        `JWT authentication failed: ${info?.message || err?.message}`,
        {
          ip: request.ip,
          userAgent: request.get('User-Agent'),
          path: request.path,
        },
      );

      throw err || new UnauthorizedException('Authentication failed');
    }

    return user;
  }

  private extractTokenFromHeader(request: any): string | null {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
