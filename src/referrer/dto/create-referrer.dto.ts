import { IsString, IsOptional } from 'class-validator';

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
}
