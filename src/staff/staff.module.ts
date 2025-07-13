import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Staff } from './staff.entity';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';
import { CacheService } from '../common/services/cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([Staff, User, Auth])],
  controllers: [StaffController],
  providers: [StaffService, CacheService],
  exports: [StaffService],
})
export class StaffModule {}
