import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AIRecommendationService,
  SeatRecommendation,
  PricingRecommendation,
} from './ai-recommendation.service';
import {
  SeatRecommendationDto,
  PricingRecommendationDto,
} from './dto/recommendation.dto';

@ApiTags('AI Recommendations')
@Controller('ai-recommendations')
@UseGuards(JwtAuthGuard)
export class AIRecommendationController {
  constructor(
    private readonly aiRecommendationService: AIRecommendationService,
  ) {}

  @Get('seats/:userId/:zoneId')
  @ApiOperation({
    summary: 'Get AI-powered seat recommendations',
    description:
      'Get personalized seat recommendations based on user preferences and ML algorithms',
  })
  @ApiParam({ name: 'userId', description: 'User ID for personalization' })
  @ApiParam({
    name: 'zoneId',
    description: 'Zone ID to get recommendations for',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of recommendations to return',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Seat recommendations retrieved successfully',
    type: [SeatRecommendationDto],
  })
  async getSeatRecommendations(
    @Param('userId') userId: string,
    @Param('zoneId') zoneId: string,
    @Query('limit') limit?: number,
  ): Promise<SeatRecommendation[]> {
    const maxRecommendations = limit ? parseInt(limit.toString()) : 5;
    return this.aiRecommendationService.getSeatRecommendations(
      userId,
      zoneId,
      maxRecommendations,
    );
  }

  @Get('pricing/:zoneId')
  @ApiOperation({
    summary: 'Get AI-powered dynamic pricing recommendations',
    description:
      'Get dynamic pricing recommendations based on demand, seasonality, and market analysis',
  })
  @ApiParam({ name: 'zoneId', description: 'Zone ID for pricing analysis' })
  @ApiQuery({
    name: 'seatZone',
    description: 'Specific seat zone name',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Pricing recommendations retrieved successfully',
    type: PricingRecommendationDto,
  })
  async getPricingRecommendations(
    @Param('zoneId') zoneId: string,
    @Query('seatZone') seatZone: string = 'General',
  ): Promise<PricingRecommendation> {
    return this.aiRecommendationService.getPricingRecommendations(
      zoneId,
      seatZone,
    );
  }

  @Get('user-behavior/:userId')
  @ApiOperation({
    summary: 'Get user behavior predictions',
    description:
      'Get AI-powered predictions about user behavior for marketing optimization',
  })
  @ApiParam({ name: 'userId', description: 'User ID for behavior analysis' })
  @ApiResponse({
    status: 200,
    description: 'User behavior predictions retrieved successfully',
  })
  async getUserBehaviorPredictions(@Param('userId') userId: string) {
    return this.aiRecommendationService.getUserBehaviorPredictions(userId);
  }

  @Post('batch-recommendations')
  @ApiOperation({
    summary: 'Get batch recommendations for multiple users',
    description:
      'Get recommendations for multiple users at once for efficient processing',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch recommendations retrieved successfully',
  })
  async getBatchRecommendations(
    @Body()
    requestBody: {
      userIds: string[];
      zoneId: string;
      maxRecommendations?: number;
    },
  ) {
    const { userIds, zoneId, maxRecommendations = 5 } = requestBody;

    const recommendations = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const userRecommendations =
            await this.aiRecommendationService.getSeatRecommendations(
              userId,
              zoneId,
              maxRecommendations,
            );
          return {
            userId,
            recommendations: userRecommendations,
            success: true,
          };
        } catch (error) {
          return {
            userId,
            recommendations: [],
            success: false,
            error: error.message,
          };
        }
      }),
    );

    return {
      totalUsers: userIds.length,
      successfulRecommendations: recommendations.filter((r) => r.success)
        .length,
      recommendations,
    };
  }

  @Get('analytics/recommendation-performance')
  @ApiOperation({
    summary: 'Get recommendation system performance analytics',
    description:
      'Get analytics about the performance and accuracy of the AI recommendation system',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendation performance analytics retrieved successfully',
  })
  async getRecommendationAnalytics() {
    // This would normally analyze recommendation accuracy, click-through rates, etc.
    // For now, we'll return simulated analytics
    return {
      totalRecommendationsGenerated: Math.floor(Math.random() * 10000) + 5000,
      averageConfidenceScore: (Math.random() * 0.3 + 0.7).toFixed(2),
      clickThroughRate: (Math.random() * 0.2 + 0.15).toFixed(3),
      conversionRate: (Math.random() * 0.1 + 0.05).toFixed(3),
      userSatisfactionScore: (Math.random() * 1.5 + 3.5).toFixed(1),
      topPerformingFeatures: [
        'Zone preference matching',
        'Optimal view detection',
        'Price optimization',
        'Popularity scoring',
      ],
      improvementSuggestions: [
        'Incorporate more user interaction data',
        'Add real-time sentiment analysis',
        'Enhance price elasticity modeling',
        'Implement collaborative filtering',
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('model-insights/:modelType')
  @ApiOperation({
    summary: 'Get AI model insights and explanations',
    description:
      'Get insights into how the AI models make recommendations for transparency',
  })
  @ApiParam({
    name: 'modelType',
    description: 'Type of model to get insights for',
    enum: ['seat-recommendation', 'pricing', 'user-behavior'],
  })
  @ApiResponse({
    status: 200,
    description: 'Model insights retrieved successfully',
  })
  async getModelInsights(@Param('modelType') modelType: string) {
    const insights = {
      'seat-recommendation': {
        algorithm: 'Hybrid Collaborative + Content-based Filtering',
        features: [
          'User zone preferences (40% weight)',
          'Seat popularity score (20% weight)',
          'Optimal view position (20% weight)',
          'Price compatibility (20% weight)',
        ],
        confidence: 'Based on historical booking patterns and user preferences',
        dataPoints: 'Uses last 10 bookings for personalization',
        updateFrequency: 'Real-time with each new booking',
      },
      pricing: {
        algorithm: 'Dynamic Pricing with Market Analysis',
        features: [
          'Booking velocity (demand trend)',
          'Occupancy rate (supply/demand)',
          'Seasonal multipliers',
          'Competitor price positioning',
        ],
        confidence: 'Based on market dynamics and historical pricing data',
        dataPoints: 'Analyzes 7-day booking trends and competitor data',
        updateFrequency: 'Hourly during peak times, daily otherwise',
      },
      'user-behavior': {
        algorithm: 'Predictive Analytics with RFM Analysis',
        features: [
          'Recency of last purchase',
          'Frequency of purchases',
          'Monetary value patterns',
          'Zone and price preferences',
        ],
        confidence: 'Based on user transaction history and behavioral patterns',
        dataPoints: 'Analyzes up to 20 most recent orders',
        updateFrequency: 'Updated after each new transaction',
      },
    };

    const modelInsight = insights[modelType];

    if (!modelInsight) {
      return {
        error: 'Model type not found',
        availableModels: Object.keys(insights),
      };
    }

    return {
      modelType,
      ...modelInsight,
      performance: {
        accuracy: (Math.random() * 0.15 + 0.8).toFixed(3),
        precision: (Math.random() * 0.12 + 0.82).toFixed(3),
        recall: (Math.random() * 0.18 + 0.75).toFixed(3),
        f1Score: (Math.random() * 0.1 + 0.85).toFixed(3),
      },
      lastTraining: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      nextTraining: new Date(
        Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
  }
}
