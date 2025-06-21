import {
  IsUUID,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  userId: string;

  @IsString()
  zone: string;

  @IsString()
  customerName?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  seatIds: string[];

  @IsInt()
  total: number;

  @IsEnum(['QR', 'TRANSFER', 'CASH'])
  method: 'QR' | 'TRANSFER' | 'CASH';

  @IsOptional()
  @IsUUID()
  referrerId?: string;

  @IsOptional()
  @IsString()
  referrerCode?: string;

  @IsDateString()
  showDate: string;
}
