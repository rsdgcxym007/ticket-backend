import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  ProgressUpdate,
  ImportProgress,
  ExportProgress,
} from '../interfaces/progress.interface';

/**
 * 🎯 Progress Service - MEMORY LEAK FIXED
 * ✅ Fixed: Limited EventEmitter listeners and added proper cleanup
 */
@Injectable()
export class ProgressService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(ProgressService.name);
  private activeTasks = new Map<string, ProgressUpdate>();
  private readonly MAX_LISTENERS = 10; // 🔥 LIMIT LISTENERS
  private readonly MAX_TASKS = 100; // 🔥 LIMIT TASKS
  private cleanupInterval: NodeJS.Timeout; // 🔥 TRACK INTERVAL

  constructor() {
    super();

    // 🔥 FIXED: Set max listeners to prevent memory leak
    this.setMaxListeners(this.MAX_LISTENERS);

    // 🔥 FIXED: Auto cleanup expired tasks
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredTasks(),
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  // 🔥 FIXED: Proper cleanup on module destroy
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('🧹 Cleared cleanup interval');
    }

    // Clear all listeners
    this.removeAllListeners();
    this.activeTasks.clear();
    this.logger.log('🧹 Cleared all progress service data');
  }

  generateTaskId(prefix: string = 'task'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  updateProgress(taskId: string, update: Partial<ProgressUpdate>) {
    // 🔥 MEMORY PROTECTION: Clear old tasks if too many
    if (this.activeTasks.size > this.MAX_TASKS) {
      this.logger.warn(
        `🚨 Active tasks map too large (${this.activeTasks.size}), force cleanup`,
      );
      this.cleanupExpiredTasks();

      if (this.activeTasks.size > this.MAX_TASKS) {
        // Keep only the 50 most recent tasks
        const sortedTasks = Array.from(this.activeTasks.entries())
          .sort((a, b) => b[1].startTime.getTime() - a[1].startTime.getTime())
          .slice(0, 50);

        this.activeTasks.clear();
        sortedTasks.forEach(([id, task]) => this.activeTasks.set(id, task));
        this.logger.warn(`🚨 Force reduced tasks to ${this.activeTasks.size}`);
      }
    }

    const existing = this.activeTasks.get(taskId) || {
      taskId,
      currentStep: 0,
      totalSteps: 1,
      percentage: 0,
      status: 'PENDING',
      message: 'เริ่มต้นงาน...',
      startTime: new Date(),
    };

    const updated: ProgressUpdate = {
      ...existing,
      ...update,
      percentage: this.calculatePercentage(
        update.currentStep ?? existing.currentStep,
        update.totalSteps ?? existing.totalSteps,
      ),
      estimatedTimeRemaining: this.calculateETA(
        taskId,
        update.currentStep ?? existing.currentStep,
        update.totalSteps ?? existing.totalSteps,
      ),
    };

    this.activeTasks.set(taskId, updated);

    // 🔥 FIXED: Limit event emission to prevent memory leak
    if (this.listenerCount('progress') > 0) {
      this.emit('progress', updated);
    }

    this.logger.debug(
      `📊 Progress [${taskId}]: ${updated.percentage.toFixed(1)}% - ${updated.message}`,
    );

    return updated;
  }

  updateImportProgress(
    taskId: string,
    update: Partial<ImportProgress>,
  ): ImportProgress {
    const baseUpdate = this.updateProgress(taskId, update);

    const importProgress: ImportProgress = {
      ...baseUpdate,
      ordersProcessed: update.ordersProcessed ?? 0,
      ordersTotal: update.ordersTotal ?? 0,
      paymentsUpdated: update.paymentsUpdated ?? 0,
      commissionsRecalculated: update.commissionsRecalculated ?? 0,
      currentBatch: update.currentBatch ?? 1,
      totalBatches: update.totalBatches ?? 1,
      processedItems: update.ordersProcessed,
      totalItems: update.ordersTotal,
    };

    this.activeTasks.set(taskId, importProgress);

    // 🔥 FIXED: Check listeners before emitting
    if (this.listenerCount('importProgress') > 0) {
      this.emit('importProgress', importProgress);
    }

    return importProgress;
  }

  updateExportProgress(
    taskId: string,
    update: Partial<ExportProgress>,
  ): ExportProgress {
    const baseUpdate = this.updateProgress(taskId, update);

    const exportProgress: ExportProgress = {
      ...baseUpdate,
      ordersExported: update.ordersExported ?? 0,
      ordersTotal: update.ordersTotal ?? 0,
      currentPhase: update.currentPhase ?? 'FETCHING',
      processedItems: update.ordersExported,
      totalItems: update.ordersTotal,
    };

    this.activeTasks.set(taskId, exportProgress);

    // 🔥 FIXED: Check listeners before emitting
    if (this.listenerCount('exportProgress') > 0) {
      this.emit('exportProgress', exportProgress);
    }

    return exportProgress;
  }

  private calculatePercentage(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (current / total) * 100));
  }

  private calculateETA(taskId: string, current: number, total: number): number {
    const task = this.activeTasks.get(taskId);
    if (!task?.startTime || current === 0) return 0;

    const elapsed = Date.now() - task.startTime.getTime();
    const avgTimePerItem = elapsed / current;
    const remaining = total - current;

    return Math.round((remaining * avgTimePerItem) / 1000);
  }

  completeTask(taskId: string, message: string = 'งานเสร็จสิ้น') {
    const update = this.updateProgress(taskId, {
      status: 'COMPLETED',
      percentage: 100,
      message,
      estimatedTimeRemaining: 0,
    });

    // 🔥 FIXED: Shorter cleanup time
    setTimeout(() => {
      this.activeTasks.delete(taskId);
    }, 10000); // 10 seconds instead of 30

    return update;
  }

  failTask(taskId: string, error: string) {
    const update = this.updateProgress(taskId, {
      status: 'ERROR',
      message: `เกิดข้อผิดพลาด: ${error}`,
      errors: [error],
    });

    // 🔥 FIXED: Shorter cleanup time
    setTimeout(() => {
      this.activeTasks.delete(taskId);
    }, 30000); // 30 seconds instead of 60

    return update;
  }

  getProgress(taskId: string): ProgressUpdate | null {
    return this.activeTasks.get(taskId) || null;
  }

  getAllActiveTasks(): ProgressUpdate[] {
    return Array.from(this.activeTasks.values());
  }

  cleanupExpiredTasks() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 🔥 REDUCED: 10 minutes instead of 5
    let cleanedCount = 0;

    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.startTime && now - task.startTime.getTime() > maxAge) {
        this.activeTasks.delete(taskId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`🧹 Cleaned up ${cleanedCount} expired tasks`);
    }

    // 🔥 EXTRA PROTECTION: Log current state
    this.logger.debug(
      `📊 Active tasks: ${this.activeTasks.size}, Event listeners: ${this.listenerCount('progress')}`,
    );
  }
}
