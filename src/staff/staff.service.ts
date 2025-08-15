import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff, StaffStatus, StaffRole, StaffPermission } from './staff.entity';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CacheService } from '../common/services/cache.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 📝 สร้างพนักงานใหม่
   */
  async create(
    createStaffDto: CreateStaffDto,
    createdBy: string,
  ): Promise<Staff> {
    try {
      // ตรวจสอบว่าอีเมลซ้ำหรือไม่
      const existingStaff = await this.staffRepository.findOne({
        where: { email: createStaffDto.email },
      });

      if (existingStaff) {
        throw new BadRequestException('อีเมลนี้ถูกใช้งานแล้ว');
      }

      // ตรวจสอบว่ามี Auth record อยู่แล้วหรือไม่
      const existingAuth = await this.authRepository.findOne({
        where: { email: createStaffDto.email },
      });

      if (existingAuth) {
        throw new BadRequestException('อีเมลนี้ถูกใช้งานในระบบแล้ว');
      }

      // สร้างรหัสพนักงาน
      const staffCode = await this.generateStaffCode();

      // สร้าง permissions เริ่มต้นตาม role
      const permissions = this.getDefaultPermissions(createStaffDto.role);

      // 1. สร้าง User record
      const user = this.userRepository.create({
        email: createStaffDto.email,
        name: `${createStaffDto.firstName} ${createStaffDto.lastName}`,
        role: 'staff',
      });
      const savedUser = await this.userRepository.save(user);

      // 2. สร้าง Staff record และเชื่อมกับ User
      const staff = this.staffRepository.create({
        ...createStaffDto,
        staffCode,
        permissions: createStaffDto.permissions || permissions,
        userId: savedUser.id,
        createdBy,
      });
      const savedStaff = await this.staffRepository.save(staff);

      // 3. สร้าง Auth record สำหรับ login
      const defaultPassword = `Staff${staffCode}!`; // รหัสผ่านเริ่มต้น
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const auth = this.authRepository.create({
        email: createStaffDto.email,
        password: hashedPassword,
        displayName: `${createStaffDto.firstName} ${createStaffDto.lastName}`,
        provider: 'manual',
        providerId: savedUser.id, // ใช้เป็น unique identifier สำหรับ provider
        role: 'staff',
        userId: savedUser.id,
      });
      await this.authRepository.save(auth);

      // Clear cache
      this.cacheService.delete('staff:summary');

      this.logger.log(`✅ สร้างพนักงานใหม่: ${staffCode} พร้อม Auth และ User`);
      this.logger.log(`🔑 รหัสผ่านเริ่มต้น: ${defaultPassword}`);

      return savedStaff;
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการสร้างพนักงาน:', error);
      throw error;
    }
  }

  /**
   * 📋 ดึงรายการพนักงานทั้งหมด
   */
  async findAll(query: any): Promise<any> {
    try {
      const { status, role, department, search, page = 1, limit = 10 } = query;
      const skip = (page - 1) * limit;

      const queryBuilder = this.staffRepository
        .createQueryBuilder('staff')
        .leftJoinAndSelect('staff.user', 'user');

      // Filter conditions
      if (status) {
        queryBuilder.andWhere('staff.status = :status', { status });
      }

      if (role) {
        queryBuilder.andWhere('staff.role = :role', { role });
      }

      if (department) {
        queryBuilder.andWhere('staff.department = :department', { department });
      }

      if (search) {
        queryBuilder.andWhere(
          '(staff.firstName ILIKE :search OR staff.lastName ILIKE :search OR staff.email ILIKE :search OR staff.staffCode ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      queryBuilder.orderBy('staff.createdAt', 'DESC').skip(skip).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงรายการพนักงาน:', error);
      throw error;
    }
  }

  /**
   * 🔍 ดึงข้อมูลพนักงานตาม ID
   */
  async findOneById(id: string): Promise<Staff> {
    try {
      const staff = await this.staffRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      return staff;
    } catch (error) {
      this.logger.error(
        `เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน ID: ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * ✏️ อัปเดตข้อมูลพนักงาน
   */
  async update(
    id: string,
    updateStaffDto: UpdateStaffDto,
    updatedBy: string,
  ): Promise<Staff> {
    try {
      const staff = await this.staffRepository.findOne({ where: { id } });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      // ตรวจสอบอีเมลซ้ำ (ถ้ามีการเปลี่ยนอีเมล)
      if (updateStaffDto.email && updateStaffDto.email !== staff.email) {
        const existingStaff = await this.staffRepository.findOne({
          where: { email: updateStaffDto.email },
        });

        if (existingStaff) {
          throw new BadRequestException('อีเมลนี้ถูกใช้งานแล้ว');
        }
      }

      const result = await this.staffRepository.save({
        ...staff,
        ...updateStaffDto,
        updatedBy,
      });

      // Clear cache
      this.cacheService.delete('staff:summary');

      return result;
    } catch (error) {
      this.logger.error(`เกิดข้อผิดพลาดในการอัปเดตพนักงาน ID: ${id}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 เปลี่ยนสถานะพนักงาน
   */
  async updateStatus(
    id: string,
    status: StaffStatus,
    updatedBy: string,
  ): Promise<Staff> {
    try {
      const staff = await this.staffRepository.findOne({ where: { id } });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      const result = await this.staffRepository.save({
        ...staff,
        status,
        updatedBy,
      });

      // Clear cache
      this.cacheService.delete('staff:summary');

      this.logger.log(
        `✅ เปลี่ยนสถานะพนักงาน: ${staff.staffCode} -> ${status}`,
      );

      return result;
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
  async remove(id: string, updatedBy: string): Promise<void> {
    try {
      const staff = await this.staffRepository.findOne({ where: { id } });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      // ตั้งสถานะเป็น TERMINATED แทนการลบ
      await this.staffRepository.save({
        ...staff,
        status: StaffStatus.TERMINATED,
        updatedBy,
      });

      // Clear cache
      this.cacheService.delete('staff:summary');

      this.logger.log(`✅ ลบพนักงาน: ${staff.staffCode}`);
    } catch (error) {
      this.logger.error(`เกิดข้อผิดพลาดในการลบพนักงาน ID: ${id}:`, error);
      throw error;
    }
  }

  /**
   * 📊 สรุปข้อมูลพนักงาน
   */
  async getSummary(): Promise<any> {
    try {
      const cacheKey = 'staff:summary';
      let summary = await this.cacheService.get(cacheKey);

      if (!summary) {
        const [
          total,
          active,
          inactive,
          suspended,
          terminated,
          byRole,
          byDepartment,
        ] = await Promise.all([
          this.staffRepository.count(),
          this.staffRepository.count({ where: { status: StaffStatus.ACTIVE } }),
          this.staffRepository.count({
            where: { status: StaffStatus.INACTIVE },
          }),
          this.staffRepository.count({
            where: { status: StaffStatus.SUSPENDED },
          }),
          this.staffRepository.count({
            where: { status: StaffStatus.TERMINATED },
          }),
          this.getStaffByRole(),
          this.getStaffByDepartment(),
        ]);

        summary = {
          total,
          byStatus: {
            active,
            inactive,
            suspended,
            terminated,
          },
          byRole,
          byDepartment,
          utilization: {
            activePercentage:
              total > 0 ? Math.round((active / total) * 100) : 0,
            inactivePercentage:
              total > 0
                ? Math.round(
                    ((inactive + suspended + terminated) / total) * 100,
                  )
                : 0,
          },
        };

        // Cache for 5 minutes
        await this.cacheService.set(cacheKey, summary, 300);
      }

      return summary;
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการสรุปข้อมูลพนักงาน:', error);
      throw error;
    }
  }

  /**
   * 🏢 ดึงรายการแผนก
   */
  async getDepartments(): Promise<string[]> {
    try {
      const result = await this.staffRepository
        .createQueryBuilder('staff')
        .select('DISTINCT staff.department', 'department')
        .where('staff.department IS NOT NULL')
        .andWhere('staff.department != :empty', { empty: '' })
        .orderBy('staff.department', 'ASC')
        .getRawMany();

      return result.map((item) => item.department);
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงรายการแผนก:', error);
      throw error;
    }
  }

  /**
   * 🔑 รีเซ็ตรหัสผ่านพนักงาน
   */
  async resetPassword(staffId: string): Promise<{ password: string }> {
    try {
      const staff = await this.staffRepository.findOne({
        where: { id: staffId },
        relations: ['user'],
      });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      // สร้างรหัสผ่านใหม่
      const newPassword = `Staff${staff.staffCode}!`;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // อัปเดต Auth record
      await this.authRepository.update(
        { email: staff.email },
        { password: hashedPassword },
      );

      this.logger.log(`🔑 รีเซ็ตรหัสผ่านสำหรับพนักงาน: ${staff.staffCode}`);

      return { password: newPassword };
    } catch (error) {
      this.logger.error(`เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน:`, error);
      throw error;
    }
  }

  /**
   * 🔗 เชื่อมต่อ Staff กับ User ที่มีอยู่แล้ว
   */
  async linkStaffToUser(
    staffId: string,
    userId: string,
    updatedBy: string,
  ): Promise<Staff> {
    try {
      const staff = await this.staffRepository.findOne({
        where: { id: staffId },
      });

      if (!staff) {
        throw new BadRequestException('ไม่พบข้อมูลพนักงาน');
      }

      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('ไม่พบข้อมูลผู้ใช้');
      }

      const result = await this.staffRepository.save({
        ...staff,
        userId,
        updatedBy,
      });

      this.logger.log(
        `🔗 เชื่อมต่อ Staff ${staff.staffCode} กับ User ${user.email}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`เกิดข้อผิดพลาดในการเชื่อมต่อ Staff กับ User:`, error);
      throw error;
    }
  }

  /**
   * 📊 นับจำนวนพนักงาน
   */
  async count(options?: any): Promise<number> {
    try {
      return await this.staffRepository.count(options);
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการนับจำนวนพนักงาน:', error);
      throw error;
    }
  }

  /**
   * 💾 บันทึกข้อมูลพนักงาน
   */
  async save(staff: Partial<Staff>): Promise<Staff> {
    try {
      return await this.staffRepository.save(staff);
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการบันทึกข้อมูลพนักงาน:', error);
      throw error;
    }
  }

  /**
   * 🔍 ค้นหาพนักงานตามเงื่อนไข
   */
  async findOne(options: any): Promise<Staff> {
    try {
      return await this.staffRepository.findOne(options);
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการค้นหาพนักงาน:', error);
      throw error;
    }
  }

  /**
   * 🔨 สร้าง Query Builder
   */
  createQueryBuilder(alias: string) {
    return this.staffRepository.createQueryBuilder(alias);
  }

  private async generateStaffCode(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    const count = await this.staffRepository.count();
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

  private async getStaffByRole() {
    const result = await this.staffRepository
      .createQueryBuilder('staff')
      .select('staff.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('staff.role')
      .getRawMany();

    return result.reduce((acc, item) => {
      acc[item.role] = parseInt(item.count);
      return acc;
    }, {});
  }

  private async getStaffByDepartment() {
    const result = await this.staffRepository
      .createQueryBuilder('staff')
      .select('staff.department', 'department')
      .addSelect('COUNT(*)', 'count')
      .where('staff.department IS NOT NULL')
      .groupBy('staff.department')
      .getRawMany();

    return result.reduce((acc, item) => {
      acc[item.department] = parseInt(item.count);
      return acc;
    }, {});
  }
}
