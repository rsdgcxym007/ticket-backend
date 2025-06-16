// src/order/dto/create-order.dto.ts
import { Transform } from 'class-transformer';

export class CreateOrderDto {
  zone: string;
  orderId: string;
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',');
    return [];
  })
  seats: string[];

  total: number;
  method: string;
  slipPath?: string;
}
