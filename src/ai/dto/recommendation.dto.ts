import { ApiProperty } from '@nestjs/swagger';

export class SeatRecommendationDto {
  @ApiProperty({ description: 'Seat ID' })
  seatId: string;

  @ApiProperty({ description: 'Zone ID where the seat is located' })
  zoneId: string;

  @ApiProperty({ description: 'Recommendation score (0-100)' })
  score: number;

  @ApiProperty({ description: 'Reason for recommendation' })
  reason: string;

  @ApiProperty({ description: 'Estimated price for this seat' })
  estimatedPrice: number;

  @ApiProperty({ description: 'Availability status' })
  isAvailable: boolean;

  @ApiProperty({ description: 'Seat metadata' })
  metadata: {
    row?: string;
    column?: string;
    accessibility?: boolean;
    premium?: boolean;
  };
}

export class PricingRecommendationDto {
  @ApiProperty({ description: 'Zone ID' })
  zoneId: string;

  @ApiProperty({ description: 'Seat zone name' })
  seatZone: string;

  @ApiProperty({ description: 'Recommended price' })
  recommendedPrice: number;

  @ApiProperty({ description: 'Current market price' })
  currentPrice: number;

  @ApiProperty({ description: 'Price change percentage' })
  priceChange: number;

  @ApiProperty({ description: 'Demand level (low/medium/high)' })
  demandLevel: string;

  @ApiProperty({ description: 'Confidence score (0-100)' })
  confidence: number;

  @ApiProperty({ description: 'Factors affecting the price' })
  factors: string[];

  @ApiProperty({ description: 'Recommended pricing strategy' })
  strategy: string;
}
