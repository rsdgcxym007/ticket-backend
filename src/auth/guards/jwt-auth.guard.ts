import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from '../session.service';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly sessionService: SessionService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('=== JwtAuthGuard canActivate START ===');
    console.log('Calling super.canActivate...');

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

    // ตรวจสอบ session
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    // ดึง token ID และสร้าง hash
    const tokenId = this.sessionService.getTokenIdFromToken(token);
    if (!tokenId) {
      throw new UnauthorizedException('Invalid token format');
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
        throw new UnauthorizedException('Session expired or invalid');
      }

      console.log('✅ Session validation passed:', session.id);
      // เพิ่ม session ข้อมูลไปใน request
      request.session = session;

      console.log(
        '=== JwtAuthGuard canActivate END (session validation passed) ===',
      );
      return true;
    } catch (error) {
      console.log('❌ Session validation failed:', error.message);
      throw new UnauthorizedException('Session validation failed');
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
