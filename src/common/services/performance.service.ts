import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private metrics = new Map<
    string,
    { totalTime: number; count: number; avgTime: number }
  >();

  /**
   * เริ่มจับเวลาการทำงาน
   */
  startTimer(operation: string): { end: () => void } {
    const startTime = Date.now();

    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.recordMetric(operation, duration);

        // Log ถ้าช้าเกิน 1 วินาที
        if (duration > 1000) {
          this.logger.warn(
            `⚠️ Slow operation detected: ${operation} took ${duration}ms`,
          );
        }
      },
    };
  }

  /**
   * บันทึกข้อมูลประสิทธิภาพ
   */
  private recordMetric(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || {
      totalTime: 0,
      count: 0,
      avgTime: 0,
    };

    existing.totalTime += duration;
    existing.count += 1;
    existing.avgTime = Math.round(existing.totalTime / existing.count);

    this.metrics.set(operation, existing);

    this.logger.debug(
      `📊 ${operation}: ${duration}ms (avg: ${existing.avgTime}ms)`,
    );
  }

  /**
   * รายงานประสิทธิภาพ
   */
  getPerformanceReport(): any {
    const report = {};

    for (const [operation, metric] of this.metrics.entries()) {
      report[operation] = {
        averageTime: metric.avgTime,
        totalCalls: metric.count,
        totalTime: metric.totalTime,
        status:
          metric.avgTime < 500
            ? 'good'
            : metric.avgTime < 1000
              ? 'warning'
              : 'critical',
      };
    }

    return report;
  }

  /**
   * รีเซ็ตข้อมูลประสิทธิภาพ
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.logger.log('🔄 Performance metrics reset');
  }
}
