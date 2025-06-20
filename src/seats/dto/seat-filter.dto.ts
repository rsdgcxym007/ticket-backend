import { SeatStatus } from '../eat-status.enum';

// dto/seat-filter.dto.ts
export class SeatFilterDto {
  zoneId?: string;
  status?: SeatStatus;
}
