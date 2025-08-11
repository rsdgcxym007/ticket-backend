import {
  IsArray,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeSeatsDto {
  @ApiProperty({
    description: 'รายการหมายเลขที่นั่งใหม่',
    example: ['343', '324', '384', '362', '342', '385'],
  })
  @IsArray()
  @IsString({ each: true })
  seatIds: string[];

  @ApiProperty({
    description: 'รหัสผู้แนะนำใหม่ (ถ้าต้องการเปลี่ยน)',
    example: 'REF001',
    required: false,
  })
  @IsOptional()
  @IsString()
  newReferrerCode?: string;

  @ApiProperty({
    description: 'ชื่อลูกค้าใหม่ (ถ้าต้องการเปลี่ยน)',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  newCustomerName?: string;

  @ApiProperty({
    description: 'เบอร์โทรลูกค้าใหม่ (ถ้าต้องการเปลี่ยน)',
    example: '0812345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  newCustomerPhone?: string;

  @ApiProperty({
    description: 'อีเมลลูกค้าใหม่ (ถ้าต้องการเปลี่ยน)',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  newCustomerEmail?: string;

  @ApiProperty({
    description: 'วันที่แสดงใหม่ (ถ้าต้องการเปลี่ยน)',
    example: '2024-12-25T19:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  newShowDate?: string;

  @ApiProperty({
    description:
      'จำนวนเงินที่ชำระเพิ่มเติม (ถ้าต้องการสร้างหรืออัพเดท payment record)',
    example: 1800,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  paymentAmount?: number;
}
