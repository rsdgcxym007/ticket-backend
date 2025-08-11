import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QRCodeOptionsDto {
  @ApiPropertyOptional({
    description: 'ความกว้างของ QR Code',
    example: 256,
    minimum: 64,
    maximum: 1024,
  })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({
    description: 'ขอบของ QR Code',
    example: 2,
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  margin?: number;

  @ApiPropertyOptional({
    description: 'สีของ QR Code',
    example: { dark: '#000000', light: '#FFFFFF' },
  })
  @IsOptional()
  @IsObject()
  color?: {
    dark?: string;
    light?: string;
  };

  @ApiPropertyOptional({
    description: 'ระดับการแก้ไขข้อผิดพลาด',
    enum: ['L', 'M', 'Q', 'H'],
    example: 'M',
  })
  @IsOptional()
  @IsEnum(['L', 'M', 'Q', 'H'])
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';

  @ApiPropertyOptional({
    description: 'คุณภาพของภาพ',
    example: 0.92,
    minimum: 0.1,
    maximum: 1.0,
  })
  @IsOptional()
  @IsNumber()
  quality?: number;
}

export class CreateQRCodeDto {
  @ApiProperty({
    description: 'รหัสออเดอร์',
    example: 'ORD-20250811-001',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'รหัสผู้ใช้',
    example: 'user-uuid-123',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'วันที่การแข่งขัน',
    example: '2025-08-15T19:00:00.000Z',
  })
  @IsDateString()
  showDate: string;

  @ApiPropertyOptional({
    description: 'หมายเลขที่นั่ง (สำหรับตั๋วแบบมีที่นั่ง)',
    example: ['A1', 'A2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seats?: string[];

  @ApiProperty({
    description: 'จำนวนเงิน',
    example: 3000,
    minimum: 0,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'ประเภทตั๋ว',
    enum: ['seated', 'standing'],
    example: 'seated',
  })
  @IsEnum(['seated', 'standing'])
  ticketType: 'seated' | 'standing';

  @ApiPropertyOptional({
    description: 'ตัวเลือกการสร้าง QR Code',
    type: QRCodeOptionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => QRCodeOptionsDto)
  options?: QRCodeOptionsDto;
}

export class ValidateQRCodeDto {
  @ApiProperty({
    description: 'ข้อมูล QR Code ที่เข้ารหัสแล้ว',
    example:
      'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y96Qsv2Lm+31cmzaAILwyt...',
  })
  @IsString()
  qrData: string;
}

export class QRCodeStatsDto {
  @ApiPropertyOptional({
    description: 'วันที่เริ่มต้น',
    example: '2025-08-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'วันที่สิ้นสุด',
    example: '2025-08-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GenerateMultipleFormatsDto {
  @ApiProperty({
    description: 'ข้อมูลที่จะสร้าง QR Code',
    example: 'ข้อมูลสำหรับ QR Code',
  })
  @IsString()
  data: string;

  @ApiPropertyOptional({
    description: 'รูปแบบที่ต้องการ',
    example: ['png', 'svg'],
    enum: ['png', 'svg'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['png', 'svg'], { each: true })
  formats?: Array<'png' | 'svg'>;
}

// Response DTOs
export class QRCodeDataResponseDto {
  @ApiProperty({ description: 'รหัสออเดอร์' })
  orderId: string;

  @ApiProperty({ description: 'รหัสผู้ใช้' })
  userId: string;

  @ApiProperty({ description: 'วันที่การแข่งขัน' })
  showDate: string;

  @ApiProperty({ description: 'หมายเลขที่นั่ง' })
  seats?: string[];

  @ApiProperty({ description: 'จำนวนเงิน' })
  amount: number;

  @ApiProperty({ description: 'ประเภทตั๋ว' })
  ticketType: 'seated' | 'standing';

  @ApiProperty({ description: 'วันหมดอายุ' })
  validUntil: string;

  @ApiProperty({ description: 'ลายเซ็นรักษาความปลอดภัย' })
  securityHash: string;
}

export class QRCodeGenerationResponseDto {
  @ApiProperty({ description: 'ภาพ QR Code ในรูปแบบ Base64' })
  qrCodeImage: string;

  @ApiProperty({ description: 'ข้อมูลใน QR Code', type: QRCodeDataResponseDto })
  qrData: QRCodeDataResponseDto;
}

export class QRValidationResponseDto {
  @ApiProperty({ description: 'QR Code ถูกต้องหรือไม่' })
  isValid: boolean;

  @ApiProperty({
    description: 'ข้อมูลใน QR Code',
    type: QRCodeDataResponseDto,
    required: false,
  })
  data?: QRCodeDataResponseDto;

  @ApiProperty({ description: 'ข้อความแสดงข้อผิดพลาด', required: false })
  error?: string;

  @ApiProperty({ description: 'เวลาที่ตรวจสอบ' })
  timestamp: string;
}

export class QRCodeStatsResponseDto {
  @ApiProperty({ description: 'จำนวน QR Code ที่สร้างทั้งหมด' })
  totalGenerated: number;

  @ApiProperty({ description: 'จำนวนการสแกนทั้งหมด' })
  totalScanned: number;

  @ApiProperty({ description: 'จำนวนการสแกนที่สำเร็จ' })
  successfulScans: number;

  @ApiProperty({ description: 'จำนวนการสแกนที่ล้มเหลว' })
  failedScans: number;

  @ApiProperty({ description: 'สถิติการสแกนแยกตามวันที่' })
  scansByDate: any[];

  @ApiProperty({ description: 'สถิติการสแกนแยกตามสถานที่' })
  scansByLocation: any[];
}
