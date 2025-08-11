import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import {
  AdvancedAnalyticsService,
  PredictionResult,
  BusinessInsight,
  RevenueOptimization,
  RealTimeAnalytics,
} from './advanced-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../auth/roles.enum';
import { Throttle } from '@nestjs/throttler';

export class CustomAnalyticsQueryDto {
  metrics: string[];
  filters: Record<string, any>;
  groupBy?: string[];
  dateRange: { start: Date; end: Date };
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
}

@ApiTags('🧠 Advanced Analytics Engine')
@Controller('analytics/advanced')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvancedAnalyticsController {
  private readonly logger = new Logger(AdvancedAnalyticsController.name);

  constructor(
    private readonly advancedAnalyticsService: AdvancedAnalyticsService,
  ) {}

  /**
   * 📈 ML-Powered Sales Prediction
   */
  @Get('predictions/sales')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'การทำนายยอดขายด้วย Machine Learning',
    description: 'ใช้ Linear Regression ทำนายยอดขายในอนาคต',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'จำนวนวันที่ต้องการทำนาย (ค่าเริ่มต้น: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'ผลการทำนายยอดขาย',
    type: Object,
  })
  async predictSales(@Query('days') days?: number): Promise<PredictionResult> {
    try {
      this.logger.log(`🔮 Predicting sales for ${days || 30} days using ML`);
      return await this.advancedAnalyticsService.predictSales(days);
    } catch (error) {
      this.logger.error('❌ Sales prediction failed', error);
      throw error;
    }
  }

  /**
   * 🎯 Advanced Demand Forecasting
   */
  @Get('predictions/demand')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'การพยากรณ์ความต้องการด้วย AI',
    description: 'ใช้ Exponential Smoothing พยากรณ์ความต้องการลูกค้า',
  })
  @ApiQuery({
    name: 'zoneId',
    required: false,
    type: String,
    description: 'ID ของโซนที่ต้องการพยากรณ์',
  })
  @ApiResponse({
    status: 200,
    description: 'ผลการพยากรณ์ความต้องการ',
    type: Object,
  })
  async forecastDemand(
    @Query('zoneId') zoneId?: string,
  ): Promise<PredictionResult> {
    try {
      this.logger.log(`📊 Forecasting demand for zone: ${zoneId || 'all'}`);
      return await this.advancedAnalyticsService.forecastDemand(zoneId);
    } catch (error) {
      this.logger.error('❌ Demand forecasting failed', error);
      throw error;
    }
  }

  /**
   * 💰 Revenue Optimization
   */
  @Get('optimization/revenue')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'การเพิ่มประสิทธิภาพรายได้ด้วย AI',
    description: 'ใช้ Price Elasticity Analysis หาราคาที่เหมาะสมที่สุด',
  })
  @ApiQuery({
    name: 'zoneId',
    required: true,
    type: String,
    description: 'ID ของโซนที่ต้องการเพิ่มประสิทธิภาพ',
  })
  @ApiResponse({
    status: 200,
    description: 'ผลการเพิ่มประสิทธิภาพรายได้',
    type: Object,
  })
  async optimizeRevenue(
    @Query('zoneId') zoneId: string,
  ): Promise<RevenueOptimization> {
    try {
      this.logger.log(`💡 Optimizing revenue for zone: ${zoneId}`);
      return await this.advancedAnalyticsService.optimizeRevenue(zoneId);
    } catch (error) {
      this.logger.error('❌ Revenue optimization failed', error);
      throw error;
    }
  }

  /**
   * 🧠 AI-Generated Business Insights
   */
  @Get('insights')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'การวิเคราะห์เชิงธุรกิจด้วย AI',
    description: 'สร้างข้อมูลเชิงลึกทางธุรกิจด้วย Pattern Recognition',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลเชิงลึกทางธุรกิจ',
    type: [Object],
  })
  async getBusinessInsights(): Promise<BusinessInsight[]> {
    try {
      this.logger.log('🎯 Generating AI-powered business insights');
      return await this.advancedAnalyticsService.generateBusinessInsights();
    } catch (error) {
      this.logger.error('❌ Business insights generation failed', error);
      throw error;
    }
  }

  /**
   * ⚡ Real-time Analytics Dashboard
   */
  @Get('dashboard/realtime')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'แดชบอร์ดวิเคราะห์แบบเรียลไทม์',
    description: 'ข้อมูลวิเคราะห์และการพยากรณ์แบบเรียลไทม์',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลแดชบอร์ดแบบเรียลไทม์',
    type: Object,
  })
  async getRealTimeAnalytics(): Promise<RealTimeAnalytics> {
    try {
      this.logger.log('📊 Generating real-time analytics dashboard');
      return await this.advancedAnalyticsService.getRealTimeAnalytics();
    } catch (error) {
      this.logger.error('❌ Real-time analytics failed', error);
      throw error;
    }
  }

  /**
   * 🔍 Custom Analytics Query Engine
   */
  @Post('query/custom')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'เครื่องมือสืบค้นข้อมูลวิเคราะห์แบบกำหนดเอง',
    description: 'สร้างรายงานวิเคราะห์แบบกำหนดเองด้วย Query Engine',
  })
  @ApiBody({
    type: CustomAnalyticsQueryDto,
    description: 'พารามิเตอร์การสืบค้นข้อมูล',
  })
  @ApiResponse({
    status: 200,
    description: 'ผลการสืบค้นข้อมูลวิเคราะห์',
    type: [Object],
  })
  async executeCustomQuery(
    @Body() query: CustomAnalyticsQueryDto,
  ): Promise<any[]> {
    try {
      this.logger.log('🔍 Executing custom analytics query');
      return await this.advancedAnalyticsService.executeCustomAnalyticsQuery(
        query,
      );
    } catch (error) {
      this.logger.error('❌ Custom query execution failed', error);
      throw error;
    }
  }

  /**
   * 📈 Performance Analytics
   */
  @Get('performance')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'การวิเคราะห์ประสิทธิภาพระบบ',
    description: 'วิเคราะห์ประสิทธิภาพการทำงานของระบบด้วยเครื่องมือ ML',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลการวิเคราะห์ประสิทธิภาพ',
    type: Object,
  })
  async getPerformanceAnalytics() {
    try {
      this.logger.log('⚡ Analyzing system performance with ML');
      return await this.advancedAnalyticsService.getPerformanceAnalytics();
    } catch (error) {
      this.logger.error('❌ Performance analytics failed', error);
      throw error;
    }
  }

  /**
   * 🤖 ML Model Performance
   */
  @Get('models/performance')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'ประสิทธิภาพของโมเดล Machine Learning',
    description: 'ตรวจสอบประสิทธิภาพและสถานะของโมเดล ML ทั้งหมด',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลประสิทธิภาพโมเดล ML',
    type: Object,
  })
  async getModelPerformance() {
    try {
      this.logger.log('🔬 Checking ML model performance');
      return this.advancedAnalyticsService.getModelPerformance();
    } catch (error) {
      this.logger.error('❌ Model performance check failed', error);
      throw error;
    }
  }

  /**
   * 🧹 Clear Analytics Cache
   */
  @Post('cache/clear')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'ล้างแคชข้อมูลวิเคราะห์',
    description: 'ล้างแคชเพื่อบังคับให้ระบบคำนวณข้อมูลใหม่',
  })
  @ApiResponse({
    status: 200,
    description: 'แคชถูกล้างเรียบร้อยแล้ว',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  })
  async clearAnalyticsCache() {
    try {
      this.logger.log('🧹 Clearing analytics cache');
      this.advancedAnalyticsService.clearCache();
      return {
        message: 'Analytics cache cleared successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Cache clearing failed', error);
      throw error;
    }
  }
}
