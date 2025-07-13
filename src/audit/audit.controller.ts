import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import {
  CreateAuditLogDto,
  GetAuditLogsDto,
  GetAuditStatsDto,
  GetUserActivityDto,
  GetEntityHistoryDto,
  GetSystemActivityDto,
  SearchAuditLogsDto,
} from './dto/audit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AuthenticatedRequest } from '../common/interfaces/auth.interface';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * 📝 สร้าง audit log ใหม่
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  async createAuditLog(
    @Body() dto: CreateAuditLogDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const auditData = {
      ...dto,
      ipAddress,
      userAgent,
      userId: req.user.id,
      userRole: req.user.role,
    };

    return {
      success: true,
      message: 'Audit log created successfully',
      data: await this.auditService.log(auditData),
    };
  }

  /**
   * 📋 ดึงข้อมูล audit logs
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getAuditLogs(@Query() query: GetAuditLogsDto) {
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    const { logs, total } = await this.auditService.getAuditLogs(query);

    return {
      success: true,
      data: {
        logs,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 📊 สถิติ audit logs
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getAuditStats(@Query() query: GetAuditStatsDto) {
    return {
      success: true,
      data: await this.auditService.getAuditStats(query),
    };
  }

  /**
   * 👤 กิจกรรมของผู้ใช้
   */
  @Get('user-activity')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getUserActivity(@Query() query: GetUserActivityDto) {
    return {
      success: true,
      data: await this.auditService.getUserActivity(query),
    };
  }

  /**
   * 🔍 ประวัติของ entity
   */
  @Get('entity-history')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getEntityHistory(@Query() query: GetEntityHistoryDto) {
    return {
      success: true,
      data: await this.auditService.getEntityHistory(query),
    };
  }

  /**
   * 🔍 ประวัติของ entity ตาม ID
   */
  @Get('entity/:entityType/:entityId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getEntityHistoryById(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: number,
  ) {
    return {
      success: true,
      data: await this.auditService.getEntityHistory({
        entityType,
        entityId,
        limit: limit || 50,
      }),
    };
  }

  /**
   * 📊 กิจกรรมระบบ
   */
  @Get('system-activity')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getSystemActivity(@Query() query: GetSystemActivityDto) {
    return {
      success: true,
      data: await this.auditService.getSystemActivity(query),
    };
  }

  /**
   * 🔍 ค้นหา audit logs
   */
  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async searchAuditLogs(@Query() query: SearchAuditLogsDto) {
    return {
      success: true,
      data: await this.auditService.searchAuditLogs(query),
    };
  }

  /**
   * 📋 ข้อมูล audit log ตาม ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getAuditLogById(@Param('id') id: string) {
    return {
      success: true,
      data: await this.auditService.getAuditLogById(id),
    };
  }

  /**
   * 📈 สถิติแบบเรียลไทม์
   */
  @Get('realtime/stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getRealtimeStats() {
    return {
      success: true,
      data: await this.auditService.getRealtimeAuditStats(),
    };
  }

  /**
   * 📊 รายงานการใช้งานระบบ
   */
  @Get('reports/usage')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getUsageReport(@Query() query: GetAuditStatsDto) {
    return {
      success: true,
      data: await this.auditService.getUsageReport(query),
    };
  }

  /**
   * 🔒 รายงานการเข้าถึง
   */
  @Get('reports/access')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getAccessReport(@Query() query: GetAuditStatsDto) {
    return {
      success: true,
      data: await this.auditService.getAccessReport(query),
    };
  }

  /**
   * ⚠️ รายงานกิจกรรมที่น่าสงสัย
   */
  @Get('reports/suspicious')
  @Roles(UserRole.ADMIN)
  async getSuspiciousActivity(@Query() query: GetAuditStatsDto) {
    return {
      success: true,
      data: await this.auditService.getSuspiciousActivity(query),
    };
  }

  /**
   * 📊 ส่งออกรายงาน audit
   */
  @Post('export')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async exportAuditReport(@Body() query: GetAuditLogsDto) {
    return {
      success: true,
      data: await this.auditService.exportAuditReport(query),
    };
  }
}
