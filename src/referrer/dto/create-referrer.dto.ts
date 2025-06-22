import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateReferrerDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsBoolean()
  status: boolean;
}
