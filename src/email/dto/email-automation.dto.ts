import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SendTicketEmailDto {
  @ApiProperty({
    description: 'รหัสออเดอร์',
    example: 'ORD-20250811-001',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'อีเมลผู้รับ',
    example: 'customer@example.com',
  })
  @IsEmail()
  recipientEmail: string;

  @ApiPropertyOptional({
    description: 'ชื่อผู้รับ',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({
    description: 'ภาษาที่ใช้ส่ง email',
    example: 'th',
    enum: ['th', 'en'],
  })
  @IsOptional()
  @IsEnum(['th', 'en'])
  language?: 'th' | 'en';

  @ApiPropertyOptional({
    description: 'รวม QR Code ในอีเมลหรือไม่',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeQRCode?: boolean;

  @ApiPropertyOptional({
    description: 'หมายเหตุเพิ่มเติม',
    example: 'ขอบคุณที่ใช้บริการ',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'ประเภทตั๋ว',
    example: 'RINGSIDE',
  })
  @IsOptional()
  @IsString()
  ticketType?: string;

  @ApiPropertyOptional({
    description: 'จำนวนตั๋ว',
    example: 2,
  })
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'จำนวนตั๋วผู้ใหญ่แบบยืน',
    example: 1,
  })
  @IsOptional()
  standingAdultQty?: number;

  @ApiPropertyOptional({
    description: 'จำนวนตั๋วเด็กแบบยืน',
    example: 0,
  })
  @IsOptional()
  standingChildQty?: number;

  @ApiPropertyOptional({
    description: 'วันที่แสดง',
    example: '2025-08-15',
  })
  @IsOptional()
  @IsString()
  showDate?: string;

  @ApiPropertyOptional({
    description: 'ยอดรวม',
    example: 2800,
  })
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'หมายเลขที่นั่ง',
    example: ['A1', 'A2'],
  })
  @IsOptional()
  @IsArray()
  seatNumbers?: string[];
}

export class EmailRecipientDto {
  @ApiProperty({
    description: 'อีเมลผู้รับ',
    example: 'customer@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'ชื่อผู้รับ',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'ข้อมูลเพิ่มเติมสำหรับ personalization',
    example: { orderId: 'ORD-001', seats: ['A1', 'A2'] },
  })
  @IsOptional()
  customData?: Record<string, any>;
}

export class SendBulkEmailDto {
  @ApiProperty({
    description: 'รายการผู้รับ email',
    type: [EmailRecipientDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipientDto)
  recipients: EmailRecipientDto[];

  @ApiProperty({
    description: 'ชื่อ template ที่จะใช้',
    example: 'ticket-confirmation',
  })
  @IsString()
  templateName: string;

  @ApiProperty({
    description: 'หัวข้อ email',
    example: 'ตั๋วแมทช์มวยของคุณ',
  })
  @IsString()
  subject: string;

  @ApiPropertyOptional({
    description: 'ข้อมูลเพิ่มเติมสำหรับ template',
    example: { eventName: 'Boxing Championship 2025', eventDate: '2025-08-15' },
  })
  @IsOptional()
  templateData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'กำหนดเวลาส่ง (ถ้าต้องการส่งในอนาคต)',
    example: '2025-08-12T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class EmailTemplateDto {
  @ApiProperty({
    description: 'ชื่อ template',
    example: 'ticket-confirmation',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'หัวข้อ email template',
    example: 'ตั๋วแมทช์มวยของคุณ - {{eventName}}',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'เนื้อหา HTML template',
    example: '<h1>สวัสดี {{customerName}}</h1><p>ตั๋วของคุณ: {{orderId}}</p>',
  })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({
    description: 'เนื้อหา text template (fallback)',
    example: 'สวัสดี {{customerName}}, ตั๋วของคุณ: {{orderId}}',
  })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({
    description: 'คำอธิบาย template',
    example: 'Template สำหรับส่งตั๋วให้ลูกค้า',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'ตัวแปรที่ใช้ใน template',
    example: ['customerName', 'orderId', 'eventName', 'eventDate'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

export class EmailStatsDto {
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

  @ApiPropertyOptional({
    description: 'กรองตาม template',
    example: 'ticket-confirmation',
  })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiPropertyOptional({
    description: 'กรองตามสถานะ',
    example: 'sent',
    enum: ['sent', 'failed', 'pending', 'delivered', 'opened'],
  })
  @IsOptional()
  @IsEnum(['sent', 'failed', 'pending', 'delivered', 'opened'])
  status?: 'sent' | 'failed' | 'pending' | 'delivered' | 'opened';
}

// Response DTOs
export class EmailSendResultDto {
  @ApiProperty({ description: 'รหัสข้อความ email' })
  messageId: string;

  @ApiProperty({ description: 'รหัสออเดอร์' })
  orderId: string;

  @ApiProperty({ description: 'อีเมลผู้รับ' })
  recipientEmail: string;

  @ApiProperty({ description: 'เวลาที่ส่ง' })
  sentAt: string;

  @ApiProperty({ description: 'สถานะการส่ง' })
  status: 'sent' | 'failed' | 'pending';

  @ApiProperty({ description: 'ข้อความแสดงข้อผิดพลาด (ถ้ามี)' })
  error?: string;
}

export class BulkEmailResultDto {
  @ApiProperty({ description: 'จำนวนทั้งหมดที่พยายามส่ง' })
  totalCount: number;

  @ApiProperty({ description: 'จำนวนที่ส่งสำเร็จ' })
  successCount: number;

  @ApiProperty({ description: 'จำนวนที่ส่งล้มเหลว' })
  failedCount: number;

  @ApiProperty({
    description: 'รายละเอียดผลการส่งแต่ละอัน',
    type: [EmailSendResultDto],
  })
  results: EmailSendResultDto[];

  @ApiProperty({ description: 'รหัส batch สำหรับติดตาม' })
  batchId: string;
}

export class EmailTemplateResponseDto {
  @ApiProperty({ description: 'รหัส template' })
  id: string;

  @ApiProperty({ description: 'ชื่อ template' })
  name: string;

  @ApiProperty({ description: 'หัวข้อ email template' })
  subject: string;

  @ApiProperty({ description: 'คำอธิบาย template' })
  description?: string;

  @ApiProperty({ description: 'ตัวแปรที่ใช้ใน template' })
  variables: string[];

  @ApiProperty({ description: 'วันที่สร้าง' })
  createdAt: string;

  @ApiProperty({ description: 'วันที่แก้ไขล่าสุด' })
  updatedAt: string;
}
