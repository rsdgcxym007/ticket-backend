import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class ImportOrderDataDto {
  @ApiProperty({
    description: 'Order number',
    example: 'ORD-20241201-001',
  })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    description: 'Customer phone',
    example: '0812345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'john@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({
    description: 'Total amount',
    example: 2500,
  })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({
    description: 'Actual paid amount',
    example: 2500,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  actualPaidAmount?: number;

  @ApiProperty({
    description: 'Whether payment amount is verified',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  paymentAmountVerified?: boolean;

  @ApiProperty({
    description: 'Hotel booking confirmation number',
    example: 'HTL-12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  hotelBookingConfirmation?: string;

  @ApiProperty({
    description: 'Hotel check-in date',
    example: '2024-12-25',
    required: false,
  })
  @IsString()
  @IsOptional()
  hotelCheckInDate?: string;

  @ApiProperty({
    description: 'Hotel check-out date',
    example: '2024-12-27',
    required: false,
  })
  @IsString()
  @IsOptional()
  hotelCheckOutDate?: string;

  @ApiProperty({
    description: 'Number of hotel guests',
    example: 2,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  hotelGuestCount?: number;

  @ApiProperty({
    description: 'Additional commission from hotel',
    example: 500,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  additionalCommissionFromHotel?: number;

  @ApiProperty({
    description: 'Notes or remarks',
    example: 'VIP customer',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ImportOrdersDto {
  @ApiProperty({
    description: 'Array of order data to import',
    type: [ImportOrderDataDto],
  })
  @IsArray()
  @IsNotEmpty()
  importData: ImportOrderDataDto[];
}
