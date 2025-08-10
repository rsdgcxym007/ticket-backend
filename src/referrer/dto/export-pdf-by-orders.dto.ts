import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExportPdfByOrdersDto {
  @ApiProperty({
    description: 'Array of order IDs',
    example: ['order-123', 'order-456', 'order-789'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  orderIds: string[];

  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2024-01-01',
  })
  @IsString()
  startDate: string;

  @ApiProperty({
    description: 'End date in YYYY-MM-DD format',
    example: '2024-01-31',
  })
  @IsString()
  endDate: string;
}
