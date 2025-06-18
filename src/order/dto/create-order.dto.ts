import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  zone: string;

  @IsString()
  @IsNotEmpty()
  orderId: string;

  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',');
    return [];
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  seats: string[];

  @IsNumber()
  total: number;

  @IsString()
  @IsIn(['qr', 'cash'], { message: 'method must be either "qr" or "cash"' })
  method: string;

  @IsOptional()
  @IsString()
  slipPath?: string;
}
