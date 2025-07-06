import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['string', 'number', 'boolean', 'json'])
  type?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['string', 'number', 'boolean', 'json'])
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ConfigQueryDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
