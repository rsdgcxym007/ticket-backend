import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';
import { Staff, StaffStatus, StaffRole, StaffPermission } from './staff.entity';

@ApiTags('👥 Staff Management - จัดการพนักงาน')
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StaffController {
  private readonly logger = new Logger(StaffController.name);

  constructor(private staffService: StaffService) {}

  /**
   * 📝 สร้างพนักงานใหม่
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'สร้างพนักงานใหม่',
    description: 'สร้างบัญชีพนักงานใหม่พร้อมกำหนดบทบาทและสิทธิ์',
  })
  @ApiResponse({ status: 201, description: 'สร้างพนักงานสำเร็จ' })
  @ApiResponse({ status: 400, description: 'ข้อมูลไม่ถูกต้อง' })
  async create(
    @Body() createStaffDto: CreateStaffDto,
    @Request() req,
  ): Promise<any> {
    try {
      const savedStaff = await this.staffService.create(
        createStaffDto,
        req.user.id,
      );

      return {
        success: true,
        message: 'สร้างพนักงานสำเร็จ พร้อมบัญชีผู้ใช้และสิทธิ์ในการเข้าสู่ระบบ',
        data: savedStaff,
        note: `รหัสผ่านเริ่มต้น: Staff${savedStaff.staffCode}!`,
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการสร้างพนักงาน:', error);
      throw error;
    }
  }

  /**
   * 📋 ดึงรายการพนักงานทั้งหมด
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'ดึงรายการพนักงาน',
    description: 'ดึงรายการพนักงานทั้งหมดพร้อมตัวกรอง',
  })
  @ApiResponse({ status: 200, description: 'ดึงรายการพนักงานสำเร็จ' })
  async findAll(@Query() query: any) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        role,
        department,
        sortBy = 'createdAt',
        order = 'DESC',
      } = query;

      const queryBuilder = this.staffService.createQueryBuilder('staff');

      if (search) {
        queryBuilder.andWhere(
          '(staff.firstName ILIKE :search OR staff.lastName ILIKE :search OR staff.email ILIKE :search OR staff.staffCode ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      if (status) {
        queryBuilder.andWhere('staff.status = :status', { status });
      }

      if (role) {
        queryBuilder.andWhere('staff.role = :role', { role });
      }

      if (department) {
        queryBuilder.andWhere('staff.department = :department', { department });
      }

      queryBuilder
        .orderBy(`staff.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [items, total] = await queryBuilder.getManyAndCount();

      this.logger.log(`📋 ดึงรายการพนักงาน: ${items.length}/${total} รายการ`);

      return {
        success: true,
        message: 'ดึงรายการพนักงานสำเร็จ',
        data: {
          items,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงรายการพนักงาน:', error);
      throw error;
    }
  }

  /**
   * 📊 ดึงสรุปข้อมูลพนักงาน
   */
  @Get('analytics/summary')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'สรุปข้อมูลพนักงาน',
    description: 'แสดงสถิติและสรุปข้อมูลพนักงานในระบบ',
  })
  @ApiResponse({ status: 200, description: 'ดึงสรุปข้อมูลสำเร็จ' })
  async getAnalyticsSummary() {
    try {
      const summary = await this.getStaffSummary();

      this.logger.log('📊 ดึงสรุปข้อมูลพนักงานสำเร็จ');

      return {
        success: true,
        message: 'ดึงสรุปข้อมูลพนักงานสำเร็จ',
        data: summary,
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงสรุปข้อมูลพนักงาน:', error);
      throw error;
    }
  }

  /**
   * 🔑 ดูสิทธิ์การเข้าถึงทั้งหมด
   */
  @Get('list-permissions')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'ดูสิทธิ์การเข้าถึงทั้งหมด',
    description: 'แสดงรายการ permissions ทั้งหมดที่มีในระบบ',
  })
  @ApiResponse({
    status: 200,
    description: 'รายการ permissions ทั้งหมด',
  })
  async getAllPermissions() {
    this.logger.log('📋 Getting all available permissions');

    const permissions = Object.values(StaffPermission);
    const permissionGroups = {
      analytics: permissions.filter(
        (p) => p.includes('analytics') || p.includes('reports'),
      ),
      staff: permissions.filter((p) => p.includes('staff')),
      orders: permissions.filter((p) => p.includes('orders')),
      system: permissions.filter(
        (p) =>
          p.includes('system') || p.includes('settings') || p.includes('audit'),
      ),
      performance: permissions.filter(
        (p) => p.includes('performance') || p.includes('monitoring'),
      ),
    };

    return {
      success: true,
      message: 'ดึงข้อมูล permissions สำเร็จ',
      data: {
        all: permissions,
        groups: permissionGroups,
        total: permissions.length,
      },
    };
  }

  /**
   * 🎯 ดูสิทธิ์ของตัวเอง (สำหรับ staff ที่ login แล้ว)
   */
  @Get('my/permissions')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ดูสิทธิ์ของตัวเอง',
    description: 'staff สามารถดูสิทธิ์การเข้าถึงของตัวเองได้',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลสิทธิ์ของตัวเอง',
  })
  async getMyPermissions(@Request() req) {
    this.logger.log(`📋 Getting my permissions for user: ${req.user?.email}`);

    if (!req.user?.email) {
      throw new BadRequestException('ไม่พบข้อมูลผู้ใช้');
    }

    const staff = await this.staffService.findOne({
      where: { email: req.user.email },
      select: [
        'id',
        'staffCode',
        'firstName',
        'lastName',
        'email',
        'role',
        'status',
        'permissions',
        'department',
        'position',
      ],
    });

    if (!staff) {
      throw new BadRequestException('ไม่พบข้อมูล staff สำหรับผู้ใช้นี้');
    }

    return {
      success: true,
      message: 'ดึงข้อมูลสิทธิ์ของตัวเองสำเร็จ',
      data: {
        staff: {
          id: staff.id,
          staffCode: staff.staffCode,
          name: `${staff.firstName} ${staff.lastName}`,
          email: staff.email,
          role: staff.role,
          department: staff.department,
          position: staff.position,
        },
        permissions: {
          current: staff.permissions || [],
          total: staff.permissions?.length || 0,
          hasSystemAccess: staff.permissions?.some((p) => p.includes('system')),
          hasAnalyticsAccess: staff.permissions?.some((p) =>
            p.includes('analytics'),
          ),
          hasStaffAccess: staff.permissions?.some((p) => p.includes('staff')),
        },
      },
    };
  }

  /**
   * 🏢 ดึงรายการแผนก
   */
  @Get('meta/departments')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'ดึงรายการแผนก',
    description: 'ดึงรายการแผนกทั้งหมดในองค์กร',
  })
  @ApiResponse({ status: 200, description: 'ดึงรายการแผนกสำเร็จ' })
  async getDepartments() {
    try {
      const departments = await this.staffService
        .createQueryBuilder('staff')
        .select('DISTINCT staff.department', 'department')
        .where('staff.department IS NOT NULL')
        .getRawMany();

      const departmentList = departments.map((d) => d.department);

      this.logger.log(`🏢 ดึงรายการแผนก: ${departmentList.length} แผนก`);

      return {
        success: true,
        message: 'ดึงรายการแผนกสำเร็จ',
        data: {
          departments: departmentList,
          total: departmentList.length,
        },
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงรายการแผนก:', error);
      throw error;
    }
  }

  /**
   * 👤 ดูสิทธิ์ของ staff คนใดคนหนึ่ง
   */
  @Get(':id/permissions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ดูสิทธิ์ของ staff',
    description: 'แสดงสิทธิ์การเข้าถึงของ staff คนใดคนหนึ่ง',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลสิทธิ์ของ staff',
  })
  async getStaffPermissions(@Param('id') id: string) {
    this.logger.log(`📋 Getting permissions for staff: ${id}`);

    const staff = await this.staffService.findOne({
      where: { id },
      select: [
        'id',
        'staffCode',
        'firstName',
        'lastName',
        'email',
        'role',
        'permissions',
        'status',
        'department',
        'position',
      ],
    });

    if (!staff) {
      throw new BadRequestException('ไม่พบข้อมูล staff');
    }

    return {
      success: true,
      message: 'ดึงข้อมูลสิทธิ์ของ staff สำเร็จ',
      data: {
        staff: {
          id: staff.id,
          staffCode: staff.staffCode,
          name: `${staff.firstName} ${staff.lastName}`,
          email: staff.email,
          role: staff.role,
          department: staff.department,
          position: staff.position,
        },
        permissions: {
          current: staff.permissions || [],
          total: staff.permissions?.length || 0,
          hasSystemAccess: staff.permissions?.some((p) => p.includes('system')),
          hasAnalyticsAccess: staff.permissions?.some((p) =>
            p.includes('analytics'),
          ),
          hasStaffAccess: staff.permissions?.some((p) => p.includes('staff')),
        },
      },
    };
  }

  /**
   * 🔍 ดึงข้อมูลพนักงานตาม ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'ดึงข้อมูลพนักงาน',
    description: 'ดึงข้อมูลพนักงานรายละเอียดตาม ID',
  })
  @ApiResponse({ status: 200, description: 'ดึงข้อมูลพนักงานสำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบพนักงาน' })
  async findOne(@Param('id') id: string) {
    try {
      const staff = await this.staffService.findOne({
        where: { id },
        select: [
          'id',
          'staffCode',
          'firstName',
          'lastName',
          'email',
          'phone',
          'role',
          'status',
          'permissions',
          'department',
          'position',
          'salary',
          'hireDate',
          'avatar',
          'notes',
          'createdAt',
          'updatedAt',
        ],
      });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      this.logger.log(`🔍 ดึงข้อมูลพนักงาน: ${staff.staffCode}`);

      return {
        success: true,
        message: 'ดึงข้อมูลพนักงานสำเร็จ',
        data: staff,
      };
    } catch (error) {
      this.logger.error(
        `เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน ID: ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * ✏️ แก้ไขข้อมูลพนักงาน
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'แก้ไขข้อมูลพนักงาน',
    description: 'อัปเดตข้อมูลพนักงานตาม ID',
  })
  @ApiResponse({ status: 200, description: 'แก้ไขข้อมูลพนักงานสำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบพนักงาน' })
  async update(
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @Request() req,
  ) {
    try {
      const staff = await this.staffService.findOne({ where: { id } });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      const updatedData = {
        ...updateStaffDto,
        updatedBy: req.user.id,
      };

      const result = await this.staffService.save({
        ...staff,
        ...updatedData,
      } as Staff);

      this.logger.log(`✏️ อัปเดตข้อมูลพนักงาน: ${staff.staffCode}`);

      return {
        success: true,
        message: 'แก้ไขข้อมูลพนักงานสำเร็จ',
        data: result,
      };
    } catch (error) {
      this.logger.error(`เกิดข้อผิดพลาดในการอัปเดตพนักงาน ID: ${id}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 เปลี่ยนสถานะพนักงาน
   */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'เปลี่ยนสถานะพนักงาน',
    description: 'เปลี่ยนสถานะการทำงานของพนักงาน (เปิด/ปิดใช้งาน)',
  })
  @ApiResponse({ status: 200, description: 'เปลี่ยนสถานะพนักงานสำเร็จ' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: StaffStatus,
    @Request() req,
  ) {
    if (!Object.values(StaffStatus).includes(status)) {
      throw new BadRequestException('สถานะไม่ถูกต้อง');
    }

    try {
      const staff = await this.staffService.findOne({ where: { id } });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      const result = await this.staffService.save({
        ...staff,
        status,
        updatedBy: req.user.id,
      });

      this.logger.log(
        `✅ เปลี่ยนสถานะพนักงาน: ${staff.staffCode} -> ${status}`,
      );

      return {
        success: true,
        message: 'เปลี่ยนสถานะพนักงานสำเร็จ',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `เกิดข้อผิดพลาดในการเปลี่ยนสถานะพนักงาน ID: ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 🗑️ ลบพนักงาน (Soft Delete)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'ลบพนักงาน',
    description: 'ลบพนักงานออกจากระบบ (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'ลบพนักงานสำเร็จ' })
  @ApiResponse({ status: 404, description: 'ไม่พบพนักงาน' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const staff = await this.staffService.findOne({ where: { id } });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      // Soft delete by setting status to TERMINATED
      await this.staffService.save({
        ...staff,
        status: StaffStatus.TERMINATED,
        updatedBy: req.user.id,
      });

      this.logger.log(`🗑️ ลบพนักงาน: ${staff.staffCode}`);

      return {
        success: true,
        message: 'ลบพนักงานสำเร็จ',
        data: { id: staff.id, staffCode: staff.staffCode },
      };
    } catch (error) {
      this.logger.error(`เกิดข้อผิดพลาดในการลบพนักงาน ID: ${id}:`, error);
      throw error;
    }
  }

  /**
   * 🔑 รีเซ็ตรหัสผ่านพนักงาน
   */
  @Patch(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'รีเซ็ตรหัสผ่านพนักงาน',
    description: 'รีเซ็ตรหัสผ่านของพนักงานเป็นรหัสผ่านเริ่มต้น',
  })
  @ApiResponse({ status: 200, description: 'รีเซ็ตรหัสผ่านสำเร็จ' })
  async resetPassword(@Param('id') id: string): Promise<any> {
    try {
      const result = await this.staffService.resetPassword(id);

      return {
        success: true,
        message: 'รีเซ็ตรหัสผ่านสำเร็จ',
        data: {
          newPassword: result.password,
          note: 'กรุณาแจ้งรหัสผ่านใหม่ให้กับพนักงาน',
        },
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน:', error);
      throw error;
    }
  }

  /**
   * 🔗 เชื่อมต่อ Staff กับ User
   */
  @Patch(':id/link-user')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'เชื่อมต่อ Staff กับ User',
    description: 'เชื่อมต่อข้อมูล Staff กับบัญชี User ที่มีอยู่แล้ว',
  })
  @ApiResponse({ status: 200, description: 'เชื่อมต่อสำเร็จ' })
  async linkToUser(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Request() req,
  ): Promise<any> {
    try {
      const result = await this.staffService.linkStaffToUser(
        id,
        userId,
        req.user.id,
      );

      return {
        success: true,
        message: 'เชื่อมต่อ Staff กับ User สำเร็จ',
        data: result,
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการเชื่อมต่อ:', error);
      throw error;
    }
  }

  // Private methods
  private async generateStaffCode(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    const count = await this.staffService.count();
    const sequence = (count + 1).toString().padStart(4, '0');

    return `STF${year}${month}${sequence}`;
  }

  private getDefaultPermissions(role: StaffRole): StaffPermission[] {
    const permissionMap = {
      [StaffRole.ADMIN]: Object.values(StaffPermission),
      [StaffRole.MANAGER]: [
        StaffPermission.VIEW_ANALYTICS,
        StaffPermission.EXPORT_REPORTS,
        StaffPermission.VIEW_STAFF,
        StaffPermission.MANAGE_ORDERS,
        StaffPermission.CANCEL_ORDERS,
        StaffPermission.VIEW_PERFORMANCE,
      ],
      [StaffRole.SUPERVISOR]: [
        StaffPermission.VIEW_ANALYTICS,
        StaffPermission.VIEW_STAFF,
        StaffPermission.MANAGE_ORDERS,
        StaffPermission.VIEW_PERFORMANCE,
      ],
      [StaffRole.STAFF]: [
        StaffPermission.VIEW_STAFF,
        StaffPermission.MANAGE_ORDERS,
      ],
    };

    return permissionMap[role] || [];
  }

  private async getStaffSummary() {
    const [
      total,
      active,
      inactive,
      suspended,
      terminated,
      byRole,
      byDepartment,
    ] = await Promise.all([
      this.staffService.count(),
      this.staffService.count({ where: { status: StaffStatus.ACTIVE } }),
      this.staffService.count({ where: { status: StaffStatus.INACTIVE } }),
      this.staffService.count({ where: { status: StaffStatus.SUSPENDED } }),
      this.staffService.count({ where: { status: StaffStatus.TERMINATED } }),
      this.getStaffByRole(),
      this.getStaffByDepartment(),
    ]);

    return {
      counts: {
        total,
        active,
        inactive,
        suspended,
        terminated,
      },
      distribution: {
        byRole,
        byDepartment,
      },
      growth: {
        thisMonth: await this.getStaffCountByMonth(new Date()),
        lastMonth: await this.getStaffCountByMonth(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ),
      },
    };
  }

  private async getStaffByRole() {
    const result = await this.staffService
      .createQueryBuilder('staff')
      .select('staff.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('staff.status != :status', { status: StaffStatus.TERMINATED })
      .groupBy('staff.role')
      .getRawMany();

    return result.reduce(
      (acc, item) => {
        acc[item.role] = parseInt(item.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private async getStaffByDepartment() {
    const result = await this.staffService
      .createQueryBuilder('staff')
      .select('staff.department', 'department')
      .addSelect('COUNT(*)', 'count')
      .where('staff.status != :status', { status: StaffStatus.TERMINATED })
      .andWhere('staff.department IS NOT NULL')
      .groupBy('staff.department')
      .getRawMany();

    return result.reduce(
      (acc, item) => {
        acc[item.department] = parseInt(item.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private async getStaffCountByMonth(date: Date): Promise<number> {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return this.staffService
      .createQueryBuilder('staff')
      .where('staff.createdAt >= :start', { start: startOfMonth })
      .andWhere('staff.createdAt <= :end', { end: endOfMonth })
      .getCount();
  }
}
