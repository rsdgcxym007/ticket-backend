import { IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExportPdfByOrderIdsOnlyDto {
  @ApiProperty({
    description: 'Array of order IDs',
    example: ['order-123', 'order-456', 'order-789'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  orderIds: string[];
}
