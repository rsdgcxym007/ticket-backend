import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  ProgressUpdate,
  ImportProgress,
  ExportProgress,
} from '../interfaces/progress.interface';

@Injectable()
export class ProgressService extends EventEmitter {
  private readonly logger = new Logger(ProgressService.name);
  private activeTasks = new Map<string, ProgressUpdate>();

  /**
   * 🆔 สร้าง Task ID ใหม่
   */
  generateTaskId(prefix: string = 'task'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 📊 อัปเดต Progress
   */
  updateProgress(taskId: string, update: Partial<ProgressUpdate>) {
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

    // Emit event สำหรับ WebSocket
    this.emit('progress', updated);

    this.logger.debug(
      `📊 Progress [${taskId}]: ${updated.percentage.toFixed(1)}% - ${updated.message}`,
    );

    return updated;
  }

  /**
   * 📈 อัปเดต Import Progress
   */
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
    this.emit('importProgress', importProgress);

    return importProgress;
  }

  /**
   * 📤 อัปเดต Export Progress
   */
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
    this.emit('exportProgress', exportProgress);

    return exportProgress;
  }

  /**
   * 📊 คำนวณเปอร์เซ็นต์
   */
  private calculatePercentage(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (current / total) * 100));
  }

  /**
   * ⏱️ คำนวณเวลาที่เหลือ (ETA)
   */
  private calculateETA(taskId: string, current: number, total: number): number {
    const task = this.activeTasks.get(taskId);
    if (!task?.startTime || current === 0) return 0;

    const elapsed = Date.now() - task.startTime.getTime();
    const avgTimePerItem = elapsed / current;
    const remaining = total - current;

    return Math.round((remaining * avgTimePerItem) / 1000); // seconds
  }

  /**
   * ✅ ทำเครื่องหมายงานเสร็จสิ้น
   */
  completeTask(taskId: string, message: string = 'งานเสร็จสิ้น') {
    const update = this.updateProgress(taskId, {
      status: 'COMPLETED',
      percentage: 100,
      message,
      estimatedTimeRemaining: 0,
    });

    // ลบจาก active tasks หลัง 30 วินาที
    setTimeout(() => {
      this.activeTasks.delete(taskId);
    }, 30000);

    return update;
  }

  /**
   * ❌ ทำเครื่องหมายงานล้มเหลว
   */
  failTask(taskId: string, error: string) {
    const update = this.updateProgress(taskId, {
      status: 'ERROR',
      message: `เกิดข้อผิดพลาด: ${error}`,
      errors: [error],
    });

    // ลบจาก active tasks หลัง 60 วินาที
    setTimeout(() => {
      this.activeTasks.delete(taskId);
    }, 60000);

    return update;
  }

  /**
   * 📋 ดึงข้อมูล Progress
   */
  getProgress(taskId: string): ProgressUpdate | null {
    return this.activeTasks.get(taskId) || null;
  }

  /**
   * 📜 ดึงรายการงานทั้งหมด
   */
  getAllActiveTasks(): ProgressUpdate[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * 🧹 ทำความสะอาดงานที่หมดอายุ
   */
  cleanupExpiredTasks() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.startTime && now - task.startTime.getTime() > maxAge) {
        this.activeTasks.delete(taskId);
        this.logger.debug(`🧹 Cleaned up expired task: ${taskId}`);
      }
    }
  }
}
