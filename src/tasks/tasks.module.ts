import { Module } from '@nestjs/common';
import { CacheCleanupTask } from './cache-cleanup.task';
import { CacheService } from '../common/services/cache.service';

@Module({
  providers: [CacheCleanupTask, CacheService],
  exports: [CacheCleanupTask],
})
export class TasksModule {}
