import { PartialType } from '@nestjs/mapped-types';
import { CreateReferrerDto } from './create-referrer.dto';
import { IsDate, IsOptional, IsBoolean } from 'class-validator';

export class UpdateReferrerDto extends PartialType(CreateReferrerDto) {
  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsDate()
  updatedAt?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
