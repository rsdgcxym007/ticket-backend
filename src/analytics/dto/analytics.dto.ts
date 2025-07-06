import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ReportType, PaymentMethod, OrderStatus } from '../../common/enums';
import { Type } from 'class-transformer';

export class GetDailySalesReportDto {
  @IsDateString()
  date: string;
}

export class GetMonthlySalesReportDto {
  @IsString()
  month: string; // YYYY-MM format

  @IsNumber()
  @Min(1900)
  @Max(2100)
  year: number;
}

export class GetDateRangeReportDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class GetReferrerReportDto {
  @IsOptional()
  @IsString()
  referrerId?: string;

  @IsOptional()
  @IsString()
  referrerCode?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class GetSeatUtilizationReportDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  zoneId?: string;
}

export class GetRevenueReportDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;
}

export class GetTopReferrersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GetPaymentMethodStatsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class GetHourlyStatsDto {
  @IsDateString()
  date: string;
}

export class GetPerformanceMetricsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ExportReportDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  format?: string = 'excel'; // excel, csv, pdf

  @IsOptional()
  @IsString()
  referrerId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;
}

export class GetCustomReportDto {
  @IsString()
  reportName: string;

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsString()
  filterBy?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}
