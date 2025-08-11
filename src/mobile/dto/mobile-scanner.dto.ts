import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
  ArrayNotEmpty,
} from 'class-validator';

export class ScanQRCodeDto {
  @ApiProperty({
    description: 'ข้อมูล QR Code ที่สแกนได้',
    example:
      'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y96Qsv2Lm+31cmzaAILwyt...',
  })
  @IsString()
  qrData: string;

  @ApiPropertyOptional({
    description: 'ตำแหน่งที่สแกน',
    example: 'Main Gate',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'รหัสอุปกรณ์ที่ใช้สแกน',
    example: 'mobile-001',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'หมายเหตุเพิ่มเติม',
    example: 'ลูกค้ามาช้า',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkScanDto {
  @ApiProperty({
    description: 'รายการ QR Code ที่จะสแกนหลายอัน',
    example: [
      'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y96Qsv2Lm+31cmzaAILwyt...',
      'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y96Qsv2Lm+31cmzaAILwyt...',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  qrCodes: string[];

  @ApiPropertyOptional({
    description: 'ตำแหน่งที่สแกน',
    example: 'Main Gate',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'รหัสอุปกรณ์ที่ใช้สแกน',
    example: 'mobile-001',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class ScanStatsDto {
  @ApiPropertyOptional({
    description: 'วันที่เริ่มต้น (YYYY-MM-DD)',
    example: '2025-08-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'วันที่สิ้นสุด (YYYY-MM-DD)',
    example: '2025-08-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ScanHistoryDto {
  @ApiPropertyOptional({
    description: 'หน้าที่ต้องการ',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'จำนวนรายการต่อหน้า',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'ค้นหาตาม Order ID',
    example: 'ORD-20250811-001',
  })
  @IsOptional()
  @IsString()
  searchOrderId?: string;

  @ApiPropertyOptional({
    description: 'กรองตามผลการสแกน',
    example: 'success',
    enum: ['success', 'failed', 'all'],
  })
  @IsOptional()
  @IsString()
  filterResult?: 'success' | 'failed' | 'all';
}

// Response DTOs
export class ScanResultDto {
  @ApiProperty({ description: 'การสแกนสำเร็จหรือไม่' })
  success: boolean;

  @ApiProperty({ description: 'ข้อมูลผลการสแกน' })
  data: {
    orderId?: string;
    isValid: boolean;
    attendanceStatus?: string;
    ticketType?: string;
    seats?: string[];
    amount?: number;
    showDate?: string;
    validUntil?: string;
  };

  @ApiProperty({ description: 'ข้อความแสดงผล' })
  message: string;

  @ApiProperty({ description: 'เวลาที่สแกน' })
  timestamp: string;
}

export class BulkScanResultDto {
  @ApiProperty({ description: 'การสแกนสำเร็จหรือไม่' })
  success: boolean;

  @ApiProperty({ description: 'ข้อมูลผลการสแกนหลายอัน' })
  data: {
    totalScanned: number;
    successCount: number;
    failCount: number;
    results: Array<{
      qrData: string;
      isValid: boolean;
      orderId?: string;
      error?: string;
    }>;
  };

  @ApiProperty({ description: 'ข้อความแสดงผล' })
  message: string;

  @ApiProperty({ description: 'เวลาที่สแกน' })
  timestamp: string;
}

export class SyncOfflineDataDto {
  @ApiProperty({
    description: 'รายการข้อมูลออฟไลน์ที่จะซิงค์',
    example: [
      {
        qrData: 'offline-qr-data-1',
        scanTime: '2025-08-11T14:30:00.000Z',
        location: 'Main Gate',
        deviceId: 'mobile-001',
      },
    ],
  })
  @IsArray()
  records: Array<{
    qrData: string;
    scanTime: string;
    location?: string;
    deviceId?: string;
    notes?: string;
  }>;

  @ApiPropertyOptional({
    description: 'เวลาซิงค์ครั้งล่าสุด',
    example: '2025-08-11T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  lastSyncTime?: string;
}
