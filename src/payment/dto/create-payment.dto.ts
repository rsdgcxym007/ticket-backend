import { IsNotEmpty, IsString, IsNumberString } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @IsNotEmpty()
  @IsString()
  ref1: string;

  @IsNotEmpty()
  @IsString()
  ref2: string;
}
