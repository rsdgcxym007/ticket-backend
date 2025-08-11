import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserSession } from './entities/user-session.entity';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * สร้าง session ใหม่สำหรับ user
   */
  async createSession(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ access_token: string; session: UserSession }> {
    // ปิด sessions เก่าทั้งหมดของ user (single session policy)
    await this.revokeAllUserSessions(userId);

    // สร้าง JWT ID ที่ unique
    const tokenId = crypto.randomUUID();

    // สร้าง JWT payload
    const payload = {
      sub: userId,
      jti: tokenId, // JWT ID
      iat: Math.floor(Date.now() / 1000),
    };

    // สร้าง access token
    const access_token = this.jwtService.sign(payload);

    // Hash token สำหรับเก็บใน database
    const tokenHash = crypto
      .createHash('sha256')
      .update(access_token)
      .digest('hex');

    // คำนวณเวลาหมดอายุ (1 วัน)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    // สร้าง session record
    const session = this.sessionRepo.create({
      userId,
      tokenId,
      tokenHash,
      deviceInfo: deviceInfo?.substring(0, 100), // จำกัดความยาว
      ipAddress,
      userAgent: userAgent?.substring(0, 500), // จำกัดความยาว
      expiresAt,
      lastUsedAt: new Date(),
      isActive: true,
    });

    const savedSession = await this.sessionRepo.save(session);

    this.logger.log(
      `New session created for user ${userId}, token ID: ${tokenId}`,
    );

    return {
      access_token,
      session: savedSession,
    };
  }

  /**
   * ตรวจสอบ session ว่ายังใช้งานได้หรือไม่
   */
  async validateSession(
    tokenId: string,
    tokenHash: string,
  ): Promise<UserSession | null> {
    const session = await this.sessionRepo.findOne({
      where: {
        tokenId,
        tokenHash,
        isActive: true,
      },
      relations: ['user'],
    });

    if (!session) {
      return null;
    }

    // ตรวจสอบว่า token หมดอายุหรือไม่
    if (session.expiresAt < new Date()) {
      await this.revokeSession(session.id);
      return null;
    }

    // อัพเดท lastUsedAt
    await this.sessionRepo.update(session.id, {
      lastUsedAt: new Date(),
    });

    return session;
  }

  /**
   * ปิด session เดียว
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      isActive: false,
    });

    this.logger.log(`Session ${sessionId} revoked`);
  }

  /**
   * ปิด sessions ทั้งหมดของ user
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const result = await this.sessionRepo.update(
      { userId, isActive: true },
      { isActive: false },
    );

    this.logger.log(`${result.affected} sessions revoked for user ${userId}`);
  }

  /**
   * ปิด session โดยใช้ token ID
   */
  async revokeSessionByTokenId(tokenId: string): Promise<void> {
    await this.sessionRepo.update(
      { tokenId, isActive: true },
      { isActive: false },
    );

    this.logger.log(`Session with token ID ${tokenId} revoked`);
  }

  /**
   * ดึงรายการ active sessions ของ user
   */
  async getUserActiveSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepo.find({
      where: {
        userId,
        isActive: true,
      },
      order: {
        lastUsedAt: 'DESC',
      },
    });
  }

  /**
   * ทำความสะอาด sessions ที่หมดอายุ (รัน cron job)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    const expiredSessions = await this.sessionRepo.find({
      where: {
        expiresAt: LessThan(new Date()),
        isActive: true,
      },
    });

    if (expiredSessions.length > 0) {
      await this.sessionRepo.update(
        { expiresAt: LessThan(new Date()), isActive: true },
        { isActive: false },
      );

      this.logger.log(
        `🧹 Cleaned up ${expiredSessions.length} expired sessions`,
      );
    }
  }

  /**
   * สร้าง token hash จาก access token
   */
  createTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * แยก token ID จาก JWT token
   */
  getTokenIdFromToken(token: string): string | null {
    try {
      const decoded = this.jwtService.decode(token) as any;
      return decoded?.jti || null;
    } catch (error) {
      return null;
    }
  }
}
