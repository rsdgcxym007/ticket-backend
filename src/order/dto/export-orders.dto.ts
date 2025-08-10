import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsIn } from 'class-validator';

export class ExportOrdersDto {
  @ApiProperty({
    description:
      'Array of order IDs to export or object with order data (empty array = export all)',
    example: ['uuid1', 'uuid2', 'uuid3'],
    type: [String],
    required: false,
  })
  @IsOptional()
  orderIds?: string[] | Record<string, any> = [];

  @ApiProperty({
    description: 'Export format',
    example: 'csv',
    enum: ['csv', 'excel'],
    required: false,
  })
  @IsOptional()
  @IsIn(['csv', 'excel'])
  format?: 'csv' | 'excel' = 'csv';

  @ApiProperty({
    description: 'Include payment information in export',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includePayments?: boolean = true;
}
