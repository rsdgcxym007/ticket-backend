import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from './auth.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { User } from '../user/user.entity';
import { Staff } from '../staff/staff.entity';
import {
  LoggingHelper,
  ErrorHandlingHelper,
  AuditHelper,
} from '../common/utils';
import { AuditAction } from '../common/enums';
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ access_token: string; user: any; staff?: any }> {
    const logger = LoggingHelper.createContextLogger('AuthService');
    const startTime = Date.now();

    return ErrorHandlingHelper.retry(async () => {
      const auth = await this.authRepo.findOne({
        where: { email: dto.email },
        relations: ['user'],
      });

      if (!auth) {
        throw ErrorHandlingHelper.createError(
          'ไม่พบอีเมลนี้ในระบบ',
          401,
          'AUTH_USER_NOT_FOUND',
        );
      }

      const isPasswordValid = await bcrypt.compare(dto.password, auth.password);
      if (!isPasswordValid) {
        throw ErrorHandlingHelper.createError(
          'รหัสผ่านไม่ถูกต้อง',
          401,
          'AUTH_INVALID_PASSWORD',
        );
      }

      if (!auth.user) {
        throw ErrorHandlingHelper.createError(
          'ไม่พบข้อมูลผู้ใช้ที่เชื่อมกับบัญชีนี้',
          404,
          'AUTH_USER_DATA_NOT_FOUND',
        );
      }

      // ตรวจสอบว่ามีข้อมูล Staff หรือไม่
      const staff = await this.staffRepo.findOne({
        where: { email: dto.email },
      });

      const payload = {
        sub: auth.user.id,
        email: auth.email,
        role: auth.user.role,
        staffId: staff?.id || null,
        permissions: staff?.permissions || [],
      };

      const access_token = this.jwtService.sign(payload);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...safeUser } = auth;

      // 📝 Audit logging for login
      await AuditHelper.log({
        action: AuditAction.LOGIN,
        entityType: 'Auth',
        entityId: auth.user.id,
        context: AuditHelper.createSystemContext({
          source: 'AuthService.login',
          email: dto.email,
          loginTime: new Date().toISOString(),
          hasStaffProfile: !!staff,
        }),
      });

      LoggingHelper.logBusinessEvent(logger, 'User login successful', {
        userId: auth.user.id,
        email: dto.email,
        hasStaffProfile: !!staff,
      });

      LoggingHelper.logPerformance(logger, 'auth.login', startTime, {
        userId: auth.user.id,
      });

      const result: any = {
        access_token,
        user: safeUser,
      };

      if (staff) {
        result.staff = {
          id: staff.id,
          staffCode: staff.staffCode,
          fullName: staff.fullName,
          role: staff.role,
          status: staff.status,
          permissions: staff.permissions,
          department: staff.department,
          position: staff.position,
        };
      }

      return result;
    }, 2);
  }
  async changePasswordByEmail(
    email: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const auth = await this.authRepo.findOne({ where: { email } });
    if (!auth) {
      throw ErrorHandlingHelper.createError(
        'User not found',
        404,
        'USER_NOT_FOUND',
      );
    }
    if (!auth.password) {
      throw ErrorHandlingHelper.createError(
        'No password set',
        400,
        'NO_PASSWORD',
      );
    }
    const isMatch = await bcrypt.compare(oldPassword, auth.password);
    if (!isMatch) {
      throw ErrorHandlingHelper.createError(
        'Old password incorrect',
        400,
        'INVALID_OLD_PASSWORD',
      );
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    auth.password = hashed;
    await this.authRepo.save(auth);
  }
  async socialLogin(profile: any): Promise<string> {
    const { id, provider, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value || '';
    const avatar = photos?.[0]?.value || '';

    let user = await this.authRepo.findOne({
      where: { providerId: id, provider },
    });

    if (!user) {
      user = this.authRepo.create({
        providerId: id,
        provider,
        email,
        displayName,
        avatar,
      });
      await this.authRepo.save(user);
    }

    const payload = { sub: user.id, role: user.role };
    return this.jwtService.sign(payload);
  }

  async getUserById(id: string): Promise<Auth> {
    return this.authRepo.findOne({ where: { id } });
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ access_token: string; user: any }> {
    const logger = LoggingHelper.createContextLogger('AuthService');
    const startTime = Date.now();

    return ErrorHandlingHelper.retry(async () => {
      const email = dto.email.toLowerCase().trim();

      const existing = await this.authRepo.findOne({ where: { email } });
      if (existing) {
        throw ErrorHandlingHelper.createError(
          'Email already in use',
          409,
          'EMAIL_ALREADY_EXISTS',
        );
      }

      const newUser = this.userRepo.create({
        email,
        name: dto.name,
        role: dto.role || 'user',
      });
      const savedUser = await this.userRepo.save(newUser);

      const hashed = await bcrypt.hash(dto.password, 10);
      const auth = this.authRepo.create({
        email: savedUser.email,
        password: hashed,
        displayName: savedUser.name,
        provider: 'manual',
        providerId: savedUser.id,
        role: savedUser.role,
      });
      await this.authRepo.save(auth);

      const payload = { sub: auth.id, email: auth.email, role: auth.role };
      const access_token = this.jwtService.sign(payload);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...safeUser } = auth;

      // 📝 Audit logging for registration
      await AuditHelper.logCreate(
        'Auth',
        auth.id,
        { email: dto.email, role: auth.role },
        AuditHelper.createSystemContext({
          source: 'AuthService.register',
          registrationTime: new Date().toISOString(),
        }),
      );

      LoggingHelper.logBusinessEvent(logger, 'User registration successful', {
        userId: auth.id,
        email: dto.email,
      });

      LoggingHelper.logPerformance(logger, 'auth.register', startTime, {
        userId: auth.id,
      });

      return { access_token, user: safeUser };
    }, 2);
  }
}
