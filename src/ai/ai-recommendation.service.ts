import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seat } from '../seats/seat.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';
import { Zone } from '../zone/zone.entity';

export interface SeatRecommendation {
  seatId: string;
  seatNumber: string;
  zone: string;
  confidence: number;
  reason: string;
  features: {
    isOptimalView: boolean;
    isPopular: boolean;
    isUserPreferred: boolean;
  };
}

export interface PricingRecommendation {
  basePrice: number;
  recommendedPrice: number;
  demandMultiplier: number;
  seasonalMultiplier: number;
  competitorAdjustment: number;
  prediction: {
    expectedSales: number;
    revenueImpact: number;
    marketPosition: string;
  };
}

@Injectable()
export class AIRecommendationService {
  private readonly logger = new Logger(AIRecommendationService.name);

  constructor(
    @InjectRepository(Seat)
    private seatRepository: Repository<Seat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
  ) {}

  /**
   * Get personalized seat recommendations based on user preferences and historical data
   */
  async getSeatRecommendations(
    userId: string,
    zoneId: string,
    maxRecommendations: number = 5,
  ): Promise<SeatRecommendation[]> {
    try {
      // Get user preferences from historical bookings
      const userPreferences = await this.getUserPreferences(userId);

      // Get available seats for the zone
      const availableSeats = await this.seatRepository.find({
        where: { zone: { id: zoneId } },
        relations: ['zone'],
      });

      // Get popularity data for seats
      const seatPopularity = await this.getSeatPopularityData(zoneId);

      // Calculate recommendations
      const recommendations: SeatRecommendation[] = [];

      for (const seat of availableSeats) {
        const confidence = this.calculateSeatConfidence(
          seat,
          userPreferences,
          seatPopularity,
        );
        const reason = this.generateRecommendationReason(
          seat,
          userPreferences,
          seatPopularity,
        );

        recommendations.push({
          seatId: seat.id,
          seatNumber:
            seat.seatNumber || `R${seat.rowIndex}C${seat.columnIndex}`,
          zone: seat.zone?.name || 'General',
          confidence,
          reason,
          features: {
            isOptimalView: this.isOptimalViewSeat(seat),
            isPopular: seatPopularity[seat.id] > 0.7,
            isUserPreferred: this.matchesUserPreferences(seat, userPreferences),
          },
        });
      }

      // Sort by confidence and return top recommendations
      return recommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxRecommendations);
    } catch (error) {
      this.logger.error(`Error getting seat recommendations: ${error.message}`);
      throw new Error('Failed to generate seat recommendations');
    }
  }

  /**
   * Get dynamic pricing recommendations based on demand and market analysis
   */
  async getPricingRecommendations(
    zoneId: string,
    seatZone: string,
  ): Promise<PricingRecommendation> {
    try {
      // Get current demand metrics
      const demandMetrics = await this.calculateDemandMetrics(zoneId, seatZone);

      // Get seasonal factors
      const seasonalMultiplier = this.calculateSeasonalMultiplier();

      // Get competitor pricing (simulated for now)
      const competitorData = await this.getCompetitorPricing(seatZone);

      // Get base price for the zone
      const basePrice = await this.getBasePriceForZone(zoneId);

      // Calculate dynamic pricing
      const demandMultiplier = this.calculateDemandMultiplier(demandMetrics);
      const competitorAdjustment = this.calculateCompetitorAdjustment(
        competitorData,
        basePrice,
      );

      const recommendedPrice = Math.round(
        basePrice *
          demandMultiplier *
          seasonalMultiplier *
          competitorAdjustment,
      );

      // Generate predictions
      const expectedSales = this.predictSales(recommendedPrice, demandMetrics);
      const revenueImpact = this.calculateRevenueImpact(
        basePrice,
        recommendedPrice,
        expectedSales,
      );
      const marketPosition = this.determineMarketPosition(
        recommendedPrice,
        competitorData,
      );

      return {
        basePrice,
        recommendedPrice,
        demandMultiplier,
        seasonalMultiplier,
        competitorAdjustment,
        prediction: {
          expectedSales,
          revenueImpact,
          marketPosition,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting pricing recommendations: ${error.message}`,
      );
      throw new Error('Failed to generate pricing recommendations');
    }
  }

  /**
   * Get user behavior predictions for marketing optimization
   */
  async getUserBehaviorPredictions(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's order history
      const orderHistory = await this.orderRepository.find({
        where: { userId },
        relations: ['seats', 'seats.zone'],
        order: { createdAt: 'DESC' },
        take: 20,
      });

      // Calculate user metrics
      const avgOrderValue = this.calculateAverageOrderValue(orderHistory);
      const purchaseFrequency = this.calculatePurchaseFrequency(orderHistory);
      const preferredZones = this.analyzePreferredZones(orderHistory);
      const priceSensitivity = this.analyzePriceSensitivity(orderHistory);

      // Predict future behavior
      const churnRisk = this.predictChurnRisk(orderHistory);
      const lifetimeValue = this.predictLifetimeValue(
        avgOrderValue,
        purchaseFrequency,
      );
      const nextPurchaseProbability = this.predictNextPurchase(orderHistory);

      return {
        userMetrics: {
          avgOrderValue,
          purchaseFrequency,
          preferredZones,
          priceSensitivity,
        },
        predictions: {
          churnRisk,
          lifetimeValue,
          nextPurchaseProbability,
          recommendedMarketing: this.getMarketingRecommendations(
            churnRisk,
            priceSensitivity,
          ),
        },
      };
    } catch (error) {
      this.logger.error(`Error predicting user behavior: ${error.message}`);
      throw new Error('Failed to predict user behavior');
    }
  }

  private async getUserPreferences(userId: string) {
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: ['seats', 'seats.zone'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const preferences = {
      preferredZones: new Map<string, number>(),
      avgOrderValue: 0,
      seatPositionPreference: 'center',
      bookingTimePattern: 'last-minute',
    };

    // Analyze zone preferences
    for (const order of orders) {
      for (const seat of order.seats || []) {
        const zoneName = seat.zone?.name || 'General';
        preferences.preferredZones.set(
          zoneName,
          (preferences.preferredZones.get(zoneName) || 0) + 1,
        );
      }
    }

    // Calculate average order value
    if (orders.length > 0) {
      const totalSpent = orders.reduce(
        (sum, order) => sum + order.totalAmount,
        0,
      );
      preferences.avgOrderValue = totalSpent / orders.length;
    }

    return preferences;
  }

  private async getSeatPopularityData(zoneId: string) {
    const popularityData: Record<string, number> = {};

    // Get booking counts for each seat in the zone
    const seatBookings = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.seats', 'seat')
      .leftJoin('seat.zone', 'zone')
      .select('seat.id', 'seatId')
      .addSelect('COUNT(*)', 'bookingCount')
      .where('zone.id = :zoneId', { zoneId })
      .groupBy('seat.id')
      .getRawMany();

    // Normalize popularity scores
    const maxBookings = Math.max(
      ...seatBookings.map((b) => parseInt(b.bookingCount)),
      1,
    );

    for (const booking of seatBookings) {
      popularityData[booking.seatId] =
        parseInt(booking.bookingCount) / maxBookings;
    }

    return popularityData;
  }

  private calculateSeatConfidence(
    seat: any,
    userPreferences: any,
    seatPopularity: Record<string, number>,
  ): number {
    let confidence = 0.5; // Base confidence

    // User preference matching (40% weight)
    if (this.matchesUserPreferences(seat, userPreferences)) {
      confidence += 0.4;
    }

    // Popularity factor (20% weight)
    const popularity = seatPopularity[seat.id] || 0;
    confidence += popularity * 0.2;

    // Price optimization (20% weight) - simplified since no price in seat
    confidence += 0.2;

    // Optimal view factor (20% weight)
    if (this.isOptimalViewSeat(seat)) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private generateRecommendationReason(
    seat: any,
    userPreferences: any,
    seatPopularity: Record<string, number>,
  ): string {
    const reasons = [];

    if (this.matchesUserPreferences(seat, userPreferences)) {
      reasons.push('matches your previous preferences');
    }

    if (seatPopularity[seat.id] > 0.7) {
      reasons.push('popular choice among customers');
    }

    if (this.isOptimalViewSeat(seat)) {
      reasons.push('optimal viewing position');
    }

    return reasons.length > 0
      ? `Recommended because it ${reasons.join(' and ')}`
      : 'Good seat option';
  }

  private matchesUserPreferences(seat: any, userPreferences: any): boolean {
    const zoneName = seat.zone?.name || 'General';
    return userPreferences.preferredZones.has(zoneName);
  }

  private isOptimalViewSeat(seat: any): boolean {
    // Simple heuristic: center seats in middle rows are optimal
    const row = seat.rowIndex || 0;
    const col = seat.columnIndex || 0;

    return row >= 5 && row <= 15 && col >= 10 && col <= 20;
  }

  private async calculateDemandMetrics(zoneId: string, seatZone: string) {
    // Simulated demand calculation based on booking velocity and time remaining
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const bookingsLastWeek = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.seats', 'seat')
      .leftJoin('seat.zone', 'zone')
      .where('zone.id = :zoneId', { zoneId })
      .andWhere('order.createdAt >= :oneWeekAgo', { oneWeekAgo })
      .getCount();

    const totalSeats = await this.seatRepository.count({
      where: { zone: { id: zoneId } },
    });

    const bookedSeats = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.seats', 'seat')
      .leftJoin('seat.zone', 'zone')
      .where('zone.id = :zoneId', { zoneId })
      .getCount();

    return {
      bookingVelocity: bookingsLastWeek / 7,
      occupancyRate: bookedSeats / totalSeats,
      timeToEvent: 30, // Simulated days to event
      competitorActivity: Math.random() * 0.5 + 0.5, // Simulated
    };
  }

  private calculateSeasonalMultiplier(): number {
    const month = new Date().getMonth();
    // Higher multipliers for peak seasons (Dec, Jun-Aug)
    const seasonalFactors = [
      0.9, 0.9, 0.95, 1.0, 1.0, 1.2, 1.3, 1.3, 1.1, 1.0, 1.0, 1.4,
    ];
    return seasonalFactors[month];
  }

  private async getCompetitorPricing(seatZone: string) {
    // Simulated competitor data
    return {
      avgPrice: 150 + Math.random() * 100,
      minPrice: 100 + Math.random() * 50,
      maxPrice: 200 + Math.random() * 150,
      marketShare: Math.random() * 0.3 + 0.2,
    };
  }

  private async getBasePriceForZone(zoneId: string): Promise<number> {
    // Simulated base price calculation
    const zone = await this.zoneRepository.findOne({ where: { id: zoneId } });
    return zone ? 150 : 100; // Base price based on zone
  }

  private calculateDemandMultiplier(demandMetrics: any): number {
    let multiplier = 1.0;

    // High booking velocity increases price
    if (demandMetrics.bookingVelocity > 10) multiplier += 0.2;
    else if (demandMetrics.bookingVelocity > 5) multiplier += 0.1;

    // High occupancy increases price
    if (demandMetrics.occupancyRate > 0.8) multiplier += 0.3;
    else if (demandMetrics.occupancyRate > 0.6) multiplier += 0.15;

    // Time pressure increases price
    if (demandMetrics.timeToEvent < 7) multiplier += 0.25;
    else if (demandMetrics.timeToEvent < 14) multiplier += 0.1;

    return Math.min(multiplier, 2.0); // Cap at 2x
  }

  private calculateCompetitorAdjustment(
    competitorData: any,
    basePrice: number,
  ): number {
    const priceDiff = (competitorData.avgPrice - basePrice) / basePrice;

    // Adjust based on competitor pricing
    if (priceDiff > 0.2)
      return 1.1; // Competitors higher, we can increase
    else if (priceDiff < -0.2)
      return 0.9; // Competitors lower, we should decrease
    else return 1.0; // Similar pricing
  }

  private predictSales(price: number, demandMetrics: any): number {
    // Simple demand curve simulation
    const baseDemand = 100;
    const priceElasticity = -1.2;
    const demandBoost = demandMetrics.bookingVelocity * 5;

    return Math.max(
      0,
      baseDemand + demandBoost + (priceElasticity * price) / 10,
    );
  }

  private calculateRevenueImpact(
    basePrice: number,
    newPrice: number,
    expectedSales: number,
  ): number {
    const baseRevenue = basePrice * expectedSales;
    const newRevenue = newPrice * expectedSales;
    return ((newRevenue - baseRevenue) / baseRevenue) * 100;
  }

  private determineMarketPosition(price: number, competitorData: any): string {
    if (price > competitorData.avgPrice * 1.2) return 'Premium';
    else if (price < competitorData.avgPrice * 0.8) return 'Value';
    else return 'Competitive';
  }

  private calculateAverageOrderValue(orders: any[]): number {
    if (orders.length === 0) return 0;
    return (
      orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length
    );
  }

  private calculatePurchaseFrequency(orders: any[]): number {
    if (orders.length < 2) return 0;

    const sortedOrders = orders.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const daysBetween =
      (new Date(sortedOrders[sortedOrders.length - 1].createdAt).getTime() -
        new Date(sortedOrders[0].createdAt).getTime()) /
      (1000 * 60 * 60 * 24);

    return orders.length / (daysBetween / 30); // Orders per month
  }

  private analyzePreferredZones(orders: any[]): string[] {
    const zoneTypes = new Map<string, number>();

    for (const order of orders) {
      for (const seat of order.seats || []) {
        const zoneName = seat.zone?.name || 'General';
        zoneTypes.set(zoneName, (zoneTypes.get(zoneName) || 0) + 1);
      }
    }

    return Array.from(zoneTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  private analyzePriceSensitivity(orders: any[]): 'low' | 'medium' | 'high' {
    if (orders.length === 0) return 'medium';

    const avgOrder = this.calculateAverageOrderValue(orders);
    const priceVariance = this.calculatePriceVariance(orders);

    if (priceVariance < avgOrder * 0.2)
      return 'low'; // Consistent high spending
    else if (priceVariance > avgOrder * 0.5)
      return 'high'; // Varies a lot with price
    else return 'medium';
  }

  private calculatePriceVariance(orders: any[]): number {
    const avg = this.calculateAverageOrderValue(orders);
    const variance =
      orders.reduce(
        (sum, order) => sum + Math.pow(order.totalAmount - avg, 2),
        0,
      ) / orders.length;
    return Math.sqrt(variance);
  }

  private predictChurnRisk(orders: any[]): 'low' | 'medium' | 'high' {
    if (orders.length === 0) return 'high';

    const lastOrderDate = new Date(
      Math.max(...orders.map((o) => new Date(o.createdAt).getTime())),
    );
    const daysSinceLastOrder =
      (Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastOrder > 180) return 'high';
    else if (daysSinceLastOrder > 90) return 'medium';
    else return 'low';
  }

  private predictLifetimeValue(
    avgOrderValue: number,
    frequency: number,
  ): number {
    // Simple CLV calculation: AOV * Frequency * Estimated Customer Lifetime (2 years)
    return avgOrderValue * frequency * 24;
  }

  private predictNextPurchase(orders: any[]): number {
    if (orders.length < 2) return 0.3;

    const frequency = this.calculatePurchaseFrequency(orders);
    const recency = this.getOrderRecency(orders);

    // Higher frequency and recent orders increase probability
    return Math.min(0.9, frequency * 0.3 + (1 - recency) * 0.4 + 0.2);
  }

  private getOrderRecency(orders: any[]): number {
    if (orders.length === 0) return 1;

    const lastOrderDate = new Date(
      Math.max(...orders.map((o) => new Date(o.createdAt).getTime())),
    );
    const daysSinceLastOrder =
      (Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);

    return Math.min(1, daysSinceLastOrder / 180); // Normalize to 6 months
  }

  private getMarketingRecommendations(
    churnRisk: string,
    priceSensitivity: string,
  ): string[] {
    const recommendations = [];

    if (churnRisk === 'high') {
      recommendations.push('Send re-engagement email with special offer');
      recommendations.push('Personalized event recommendations');
    }

    if (priceSensitivity === 'high') {
      recommendations.push('Include discount codes in communications');
      recommendations.push('Highlight value propositions');
    } else if (priceSensitivity === 'low') {
      recommendations.push('Focus on premium experiences');
      recommendations.push('Upsell VIP packages');
    }

    recommendations.push('Send event reminders');
    recommendations.push('Share customer testimonials');

    return recommendations;
  }
}
