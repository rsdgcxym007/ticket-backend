import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      this.logger.warn(
        'User not found in request - authentication may have failed',
      );
      return false;
    }

    if (!user.role) {
      // ตั้งค่า default role เป็น USER ถ้าไม่พบ
      user.role = UserRole.USER;
      this.logger.warn('User role not found, setting default role to USER');
    }

    // Debug logging
    console.log('=== RolesGuard Debug ===');
    console.log('Required roles:', requiredRoles);
    console.log('User object:', user);
    console.log('User role:', user.role);
    console.log('UserRole enum values:', Object.values(UserRole));
    console.log('=======================');

    const hasRequiredRole = requiredRoles.includes(user.role);
    if (!hasRequiredRole) {
      this.logger.warn(
        `User role ${user.role} does not match required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return hasRequiredRole;
  }
}
