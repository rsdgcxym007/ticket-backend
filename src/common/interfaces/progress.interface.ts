// ========================================
// 📊 PROGRESS TRACKING INTERFACES
// ========================================

export interface ProgressUpdate {
  taskId: string;
  currentStep: number;
  totalSteps: number;
  percentage: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  message: string;
  estimatedTimeRemaining?: number; // seconds
  processedItems?: number;
  totalItems?: number;
  startTime?: Date;
  errors?: string[];
}

export interface BatchProcessResult {
  taskId: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: string[];
  duration: number; // milliseconds
  avgTimePerItem: number; // milliseconds
}

export interface ImportProgress extends ProgressUpdate {
  ordersProcessed: number;
  ordersTotal: number;
  paymentsUpdated: number;
  commissionsRecalculated: number;
  currentBatch: number;
  totalBatches: number;
}

export interface ExportProgress extends ProgressUpdate {
  ordersExported: number;
  ordersTotal: number;
  currentPhase: 'FETCHING' | 'PROCESSING' | 'GENERATING' | 'COMPLETE';
}
