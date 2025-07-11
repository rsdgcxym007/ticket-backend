import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  LoggingHelper,
  ErrorHandlingHelper,
  DatabaseHelper,
  AuditHelper,
} from '../common/utils';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    const logger = LoggingHelper.createContextLogger('UserService');
    const startTime = Date.now();

    try {
      const users = await this.userRepo.find();

      LoggingHelper.logPerformance(logger, 'user.findAll', startTime, {
        count: users.length,
      });

      return users;
    } catch (error) {
      throw ErrorHandlingHelper.logAndTransformError(error, 'Find all users');
    }
  }

  async findById(id: string): Promise<User> {
    const logger = LoggingHelper.createContextLogger('UserService');
    const startTime = Date.now();

    try {
      const user = await this.userRepo.findOne({ where: { id } });
      if (!user) {
        throw ErrorHandlingHelper.createError(
          'User not found',
          404,
          'USER_NOT_FOUND',
        );
      }

      LoggingHelper.logPerformance(logger, 'user.findById', startTime, {
        userId: id,
      });

      return user;
    } catch (error) {
      throw ErrorHandlingHelper.logAndTransformError(error, 'Find user by ID', {
        userId: id,
      });
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const logger = LoggingHelper.createContextLogger('UserService');
    const startTime = Date.now();

    try {
      const user = await this.userRepo.findOne({ where: { email } });

      LoggingHelper.logPerformance(logger, 'user.findByEmail', startTime, {
        email,
        found: !!user,
      });

      return user;
    } catch (error) {
      throw ErrorHandlingHelper.logAndTransformError(
        error,
        'Find user by email',
        {
          metadata: { email },
        },
      );
    }
  }

  async create(dto: CreateUserDto): Promise<User> {
    const logger = LoggingHelper.createContextLogger('UserService');

    const user = await DatabaseHelper.safeCreate(this.userRepo, dto, ['email']);

    // 📝 Audit logging
    await AuditHelper.logCreate(
      'User',
      (user as any).id,
      dto,
      AuditHelper.createSystemContext({
        source: 'UserService.create',
        email: dto.email,
      }),
    );

    LoggingHelper.logBusinessEvent(logger, 'User created', {
      userId: (user as any).id,
      email: dto.email,
    });

    return user as User;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const logger = LoggingHelper.createContextLogger('UserService');

    // Get old data for audit
    const oldUser = await this.findById(id);

    const user = await DatabaseHelper.safeUpdate(this.userRepo, id, dto, [
      'email',
    ]);

    // 📝 Audit logging
    await AuditHelper.logUpdate(
      'User',
      id,
      oldUser,
      dto,
      AuditHelper.createSystemContext({
        source: 'UserService.update',
        changes: Object.keys(dto),
      }),
    );

    LoggingHelper.logBusinessEvent(logger, 'User updated', {
      userId: id,
      changes: Object.keys(dto),
    });

    return user;
  }

  async remove(id: string): Promise<void> {
    const logger = LoggingHelper.createContextLogger('UserService');

    // Get old data for audit
    const oldUser = await this.findById(id);

    const deleted = await DatabaseHelper.safeDelete(this.userRepo, id);
    if (!deleted) {
      throw ErrorHandlingHelper.createError(
        'User not found',
        404,
        'USER_NOT_FOUND',
      );
    }

    // 📝 Audit logging
    await AuditHelper.logDelete(
      'User',
      id,
      oldUser,
      AuditHelper.createSystemContext({
        source: 'UserService.remove',
      }),
    );

    LoggingHelper.logBusinessEvent(logger, 'User deleted', {
      userId: id,
    });
  }
}
