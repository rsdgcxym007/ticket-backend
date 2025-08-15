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

    // ถ้าไม่มีการกำหนด roles ให้ผ่านได้
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // ตั้งค่า default role ถ้าไม่มี
    if (!user.role) {
      user.role = UserRole.USER;
      this.logger.warn('User role not found, setting default role to USER');
    }

    return true;

    // // Original role checking (commented out for debugging)
    // const hasRequiredRole = requiredRoles.includes(user.role);
    // if (!hasRequiredRole) {
    //   this.logger.warn(
    //     `User role ${user.role} does not match required roles: ${requiredRoles.join(', ')}`,
    //   );
    // }
    // return hasRequiredRole;
  }
}
