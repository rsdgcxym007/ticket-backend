import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from './config.service';
import {
  CreateConfigDto,
  UpdateConfigDto,
  ConfigQueryDto,
} from './dto/config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 🔧 สร้าง config ใหม่
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateConfigDto) {
    return {
      success: true,
      message: 'Config created successfully',
      data: await this.configService.create(dto),
    };
  }

  /**
   * 📋 ดึงข้อมูล config ทั้งหมด
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: ConfigQueryDto) {
    return {
      success: true,
      data: await this.configService.findAll(query),
    };
  }

  /**
   * 🔍 ดึงข้อมูล config ตาม ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async findById(@Param('id') id: string) {
    return {
      success: true,
      data: await this.configService.findById(id),
    };
  }

  /**
   * 🔍 ดึงข้อมูล config ตาม key
   */
  @Get('key/:key')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async findByKey(@Param('key') key: string) {
    return {
      success: true,
      data: await this.configService.findByKey(key),
    };
  }

  /**
   * 📝 อัปเดต config
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateConfigDto) {
    return {
      success: true,
      message: 'Config updated successfully',
      data: await this.configService.update(id, dto),
    };
  }

  /**
   * 🗑️ ลบ config
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.configService.delete(id);
    return {
      success: true,
      message: 'Config deleted successfully',
    };
  }

  /**
   * 🎯 ดึงค่า config
   */
  @Get('value/:key')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getValue(@Param('key') key: string) {
    return {
      success: true,
      data: {
        key,
        value: await this.configService.getValue(key),
      },
    };
  }

  /**
   * 🎯 ตั้งค่า config
   */
  @Post('value/:key')
  @Roles(UserRole.ADMIN)
  async setValue(@Param('key') key: string, @Body() body: { value: any }) {
    return {
      success: true,
      message: 'Config value set successfully',
      data: await this.configService.setValue(key, body.value),
    };
  }

  /**
   * 🎯 ดึงค่า config หลายตัว
   */
  @Post('multiple')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getMultiple(@Body() body: { keys: string[] }) {
    return {
      success: true,
      data: await this.configService.getMultiple(body.keys),
    };
  }

  /**
   * 🎯 ดึงค่า config ตาม prefix
   */
  @Get('prefix/:prefix')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getByPrefix(@Param('prefix') prefix: string) {
    return {
      success: true,
      data: await this.configService.getByPrefix(prefix),
    };
  }

  /**
   * 🎯 เริ่มต้นค่า config เริ่มต้น
   */
  @Post('initialize')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async initializeDefaults() {
    await this.configService.initializeDefaults();
    return {
      success: true,
      message: 'Default configs initialized successfully',
    };
  }
}
