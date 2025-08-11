import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Order } from '../../order/order.entity';
import { Payment } from '../../payment/payment.entity';
import { SeatBooking } from '../../seats/seat-booking.entity';
import { Referrer } from '../../referrer/referrer.entity';
import { ProgressService } from './progress.service';
import { OrderExportImportHelper } from '../../order/helpers/order-export-import.helper';
import {
  ExportOrderData,
  ImportUpdateResult,
} from '../../order/helpers/order-export-import.helper';

@Injectable()
export class BatchProcessingService {
  private readonly logger = new Logger(BatchProcessingService.name);
  private readonly BATCH_SIZE = 500; // Process 500 orders at a time
  private readonly PARALLEL_BATCHES = 3; // Process 3 batches in parallel

  constructor(private readonly progressService: ProgressService) {}

  /**
   * 📤 Batch Export Orders (สำหรับ 10,000+ orders)
   */
  async batchExportOrders(
    orders: any[],
    taskId: string,
  ): Promise<ExportOrderData[]> {
    this.logger.log(`🚀 Starting batch export for ${orders.length} orders`);

    const totalOrders = orders.length;
    const batches = this.createBatches(orders, this.BATCH_SIZE);
    const results: ExportOrderData[] = [];

    this.progressService.updateExportProgress(taskId, {
      status: 'PROCESSING',
      currentPhase: 'PROCESSING',
      ordersTotal: totalOrders,
      ordersExported: 0,
      totalSteps: batches.length,
      currentStep: 0,
      message: 'เริ่มประมวลผลข้อมูล...',
    });

    // Process batches in parallel (controlled concurrency)
    for (let i = 0; i < batches.length; i += this.PARALLEL_BATCHES) {
      const batchGroup = batches.slice(i, i + this.PARALLEL_BATCHES);
      const batchPromises = batchGroup.map((batch, batchIndex) =>
        this.processBatchExport(batch, i + batchIndex),
      );

      const batchResults = await Promise.all(batchPromises);

      // Combine results
      for (const batchResult of batchResults) {
        results.push(...batchResult);
      }

      // Update progress
      const processedSoFar = Math.min(
        (i + this.PARALLEL_BATCHES) * this.BATCH_SIZE,
        totalOrders,
      );

      this.progressService.updateExportProgress(taskId, {
        currentStep: i + this.PARALLEL_BATCHES,
        ordersExported: processedSoFar,
        message: `ประมวลผลแล้ว ${processedSoFar}/${totalOrders} ออเดอร์`,
      });
    }

    this.progressService.updateExportProgress(taskId, {
      status: 'COMPLETED',
      currentPhase: 'COMPLETE',
      ordersExported: totalOrders,
      currentStep: batches.length,
      message: 'ส่งออกข้อมูลเสร็จสิ้น',
    });

    this.logger.log(`✅ Batch export completed: ${results.length} orders`);
    return results;
  }

  /**
   * 📥 Batch Import Orders (สำหรับ performance)
   */
  async batchImportOrders(
    importData: ExportOrderData[],
    orderRepo: Repository<Order>,
    paymentRepo: Repository<Payment>,
    seatBookingRepo: Repository<SeatBooking>,
    referrerRepo: Repository<Referrer>,
    userId: string,
    taskId: string,
  ): Promise<ImportUpdateResult> {
    this.logger.log(`🚀 Starting batch import for ${importData.length} orders`);

    const totalOrders = importData.length;
    const batches = this.createBatches(importData, this.BATCH_SIZE);

    const finalResult: ImportUpdateResult = {
      ordersUpdated: 0,
      paymentsUpdated: 0,
      commissionsRecalculated: 0,
      errors: [],
      details: [],
    };

    this.progressService.updateImportProgress(taskId, {
      status: 'PROCESSING',
      ordersTotal: totalOrders,
      ordersProcessed: 0,
      totalBatches: batches.length,
      currentBatch: 0,
      totalSteps: batches.length,
      currentStep: 0,
      message: 'เริ่มนำเข้าข้อมูล...',
    });

    // Process batches sequentially to avoid database locks
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchStartTime = Date.now();

      try {
        const batchResult = await OrderExportImportHelper.importAndUpdateOrders(
          batch,
          orderRepo,
          paymentRepo,
          seatBookingRepo,
          referrerRepo,
          userId,
        );

        // Combine results
        finalResult.ordersUpdated += batchResult.ordersUpdated;
        finalResult.paymentsUpdated += batchResult.paymentsUpdated;
        finalResult.commissionsRecalculated +=
          batchResult.commissionsRecalculated;
        finalResult.errors.push(...batchResult.errors);
        finalResult.details.push(...batchResult.details);

        const processedSoFar = Math.min((i + 1) * this.BATCH_SIZE, totalOrders);
        const batchDuration = Date.now() - batchStartTime;

        this.progressService.updateImportProgress(taskId, {
          currentStep: i + 1,
          currentBatch: i + 1,
          ordersProcessed: processedSoFar,
          paymentsUpdated: finalResult.paymentsUpdated,
          commissionsRecalculated: finalResult.commissionsRecalculated,
          message: `ประมวลผล batch ${i + 1}/${batches.length} เสร็จสิ้น (${batchDuration}ms)`,
        });

        this.logger.debug(
          `✅ Batch ${i + 1}/${batches.length} completed in ${batchDuration}ms`,
        );
      } catch (error) {
        this.logger.error(`❌ Batch ${i + 1} failed:`, error);
        finalResult.errors.push(`Batch ${i + 1}: ${error.message}`);

        this.progressService.updateImportProgress(taskId, {
          currentStep: i + 1,
          currentBatch: i + 1,
          message: `Batch ${i + 1} ล้มเหลว: ${error.message}`,
          errors: [error.message],
        });
      }
    }

    this.progressService.updateImportProgress(taskId, {
      status: 'COMPLETED',
      ordersProcessed: totalOrders,
      currentBatch: batches.length,
      currentStep: batches.length,
      message: `นำเข้าข้อมูลเสร็จสิ้น: ${finalResult.ordersUpdated} ออเดอร์อัปเดต`,
    });

    this.logger.log(
      `✅ Batch import completed: ${finalResult.ordersUpdated} orders updated`,
    );
    return finalResult;
  }

  /**
   * 🔄 Process single export batch
   */
  private async processBatchExport(
    orders: any[],
    batchIndex: number,
  ): Promise<ExportOrderData[]> {
    const startTime = Date.now();

    try {
      const result =
        OrderExportImportHelper.exportOrdersToSpreadsheetFormat(orders);
      const duration = Date.now() - startTime;

      this.logger.debug(
        `📦 Export batch ${batchIndex + 1}: ${orders.length} orders in ${duration}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`❌ Export batch ${batchIndex + 1} failed:`, error);
      throw error;
    }
  }

  /**
   * 📋 สร้าง batches จาก array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 📊 คำนวณ performance metrics
   */
  calculatePerformanceMetrics(
    totalItems: number,
    startTime: number,
    endTime: number,
  ): {
    duration: number;
    avgTimePerItem: number;
    itemsPerSecond: number;
  } {
    const duration = endTime - startTime;
    const avgTimePerItem = duration / totalItems;
    const itemsPerSecond = Math.round((totalItems / duration) * 1000);

    return {
      duration,
      avgTimePerItem,
      itemsPerSecond,
    };
  }
}
