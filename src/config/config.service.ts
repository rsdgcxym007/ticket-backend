import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AppConfig } from './config.entity';
import {
  CreateConfigDto,
  UpdateConfigDto,
  ConfigQueryDto,
} from './dto/config.dto';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(AppConfig)
    private configRepo: Repository<AppConfig>,
  ) {}

  /**
   * 🔧 สร้าง config ใหม่
   */
  async create(dto: CreateConfigDto): Promise<AppConfig> {
    const existingConfig = await this.configRepo.findOne({
      where: { key: dto.key },
    });

    if (existingConfig) {
      throw new ConflictException(`Config key '${dto.key}' already exists`);
    }

    const config = this.configRepo.create({
      ...dto,
      type: dto.type || 'string',
    });

    return await this.configRepo.save(config);
  }

  /**
   * 📋 ค้นหา config ทั้งหมด
   */
  async findAll(query: ConfigQueryDto): Promise<AppConfig[]> {
    const where: any = {};

    if (query.key) {
      where.key = Like(`%${query.key}%`);
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.isSystem !== undefined) {
      where.isSystem = query.isSystem;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return await this.configRepo.find({
      where,
      order: { key: 'ASC' },
    });
  }

  /**
   * 🔍 ค้นหา config ตาม ID
   */
  async findById(id: string): Promise<AppConfig> {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`Config with ID '${id}' not found`);
    }
    return config;
  }

  /**
   * 🔍 ค้นหา config ตาม key
   */
  async findByKey(key: string): Promise<AppConfig | null> {
    return await this.configRepo.findOne({ where: { key } });
  }

  /**
   * 📝 อัปเดต config
   */
  async update(id: string, dto: UpdateConfigDto): Promise<AppConfig> {
    const config = await this.findById(id);
    Object.assign(config, dto);
    return await this.configRepo.save(config);
  }

  /**
   * 🗑️ ลบ config
   */
  async delete(id: string): Promise<void> {
    const config = await this.findById(id);

    if (config.isSystem) {
      throw new ConflictException('Cannot delete system config');
    }

    await this.configRepo.remove(config);
  }

  /**
   * 🎯 ดึงค่า config (parsed)
   */
  async getValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    const config = await this.findByKey(key);

    if (!config || !config.isActive) {
      return defaultValue as T;
    }

    return this.parseValue(config.value, config.type) as T;
  }

  /**
   * 🎯 ตั้งค่า config
   */
  async setValue(key: string, value: any): Promise<AppConfig> {
    const config = await this.findByKey(key);

    if (config) {
      config.value = this.stringifyValue(value, config.type);
      return await this.configRepo.save(config);
    } else {
      const newConfig = this.configRepo.create({
        key,
        value: this.stringifyValue(value, this.detectType(value)),
        type: this.detectType(value),
      });
      return await this.configRepo.save(newConfig);
    }
  }

  /**
   * 🎯 ดึงค่า config หลายตัวพร้อมกัน
   */
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    const configs = await this.configRepo.find({
      where: keys.map((key) => ({ key })),
    });

    const result: Record<string, any> = {};

    for (const config of configs) {
      if (config.isActive) {
        result[config.key] = this.parseValue(config.value, config.type);
      }
    }

    return result;
  }

  /**
   * 🎯 ดึงค่า config ตาม prefix
   */
  async getByPrefix(prefix: string): Promise<Record<string, any>> {
    const configs = await this.configRepo.find({
      where: {
        key: Like(`${prefix}%`),
        isActive: true,
      },
    });

    const result: Record<string, any> = {};

    for (const config of configs) {
      result[config.key] = this.parseValue(config.value, config.type);
    }

    return result;
  }

  /**
   * 🎯 เริ่มต้นค่า config เริ่มต้น
   */
  async initializeDefaults(): Promise<void> {
    const defaults = [
      {
        key: 'app.name',
        value: 'Ticket Booking System',
        description: 'Application name',
        type: 'string',
        isSystem: true,
      },
      {
        key: 'app.version',
        value: '1.0.0',
        description: 'Application version',
        type: 'string',
        isSystem: true,
      },
      {
        key: 'booking.reservation_timeout',
        value: '5',
        description: 'Seat reservation timeout in minutes',
        type: 'number',
        isSystem: false,
      },
      {
        key: 'booking.max_seats_per_order',
        value: '10',
        description: 'Maximum seats per order',
        type: 'number',
        isSystem: false,
      },
      {
        key: 'payment.methods',
        value: JSON.stringify(['QR_CODE', 'CASH', 'BANK_TRANSFER']),
        description: 'Available payment methods',
        type: 'json',
        isSystem: false,
      },
      {
        key: 'notification.email_enabled',
        value: 'true',
        description: 'Enable email notifications',
        type: 'boolean',
        isSystem: false,
      },
      {
        key: 'notification.sms_enabled',
        value: 'false',
        description: 'Enable SMS notifications',
        type: 'boolean',
        isSystem: false,
      },
    ];

    for (const defaultConfig of defaults) {
      const existing = await this.findByKey(defaultConfig.key);
      if (!existing) {
        await this.configRepo.save(this.configRepo.create(defaultConfig));
      }
    }
  }

  /**
   * 🎯 แปลงค่า string เป็น type ที่ต้องการ
   */
  private parseValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * 🎯 แปลงค่าเป็น string
   */
  private stringifyValue(value: any, type: string): string {
    switch (type) {
      case 'json':
        return JSON.stringify(value);
      case 'boolean':
        return value ? 'true' : 'false';
      default:
        return String(value);
    }
  }

  /**
   * 🎯 ตรวจสอบประเภทข้อมูล
   */
  private detectType(value: any): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') return 'json';
    return 'string';
  }
}
