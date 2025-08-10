import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateOutstandingAmountDto {
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'ยอดค้างต้องเป็นตัวเลข' },
  )
  @IsOptional()
  @Min(0, { message: 'ยอดค้างต้องไม่ติดลบ' })
  outstandingAmount: number;
}
