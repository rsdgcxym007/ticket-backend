import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { success } from '../common/responses';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Req() req: Request) {
    const data = await this.dashboardService.getDashboardData();
    return success(data, 'Dashboard summary', req);
  }
}
