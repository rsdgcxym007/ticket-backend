// ========================================
// 🎯 DATABASE HELPER - ฟังก์ชันสำหรับจัดการ Database Operations
// ========================================

import {
  Repository,
  SelectQueryBuilder,
  FindOptionsWhere,
  DeepPartial,
} from 'typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchOptions {
  searchFields?: string[];
  searchTerm?: string;
  filters?: Record<string, any>;
  dateRange?: {
    field: string;
    from?: Date;
    to?: Date;
  };
}

export class DatabaseHelper {
  private static readonly logger = new Logger(DatabaseHelper.name);

  /**
   * 🎯 Generic Pagination สำหรับ Repository
   */
  static async paginate<T>(
    repository: Repository<T>,
    options: PaginationOptions = {},
    searchOptions: SearchOptions = {},
    relations: string[] = [],
  ): Promise<PaginationResult<T>> {
    const {
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'DESC',
    } = options;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    try {
      const queryBuilder = repository.createQueryBuilder('entity');

      // Add relations
      relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });

      // Apply search
      this.applySearch(queryBuilder, searchOptions);

      // Apply sorting
      queryBuilder.orderBy(`entity.${sort}`, order);

      // Apply pagination
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      this.logger.error('Pagination error:', error);
      throw new InternalServerErrorException('Failed to paginate data');
    }
  }

  /**
   * 🎯 Apply Search Conditions to QueryBuilder
   */
  private static applySearch<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: SearchOptions,
  ): void {
    const { searchFields = [], searchTerm, filters = {}, dateRange } = options;

    // Apply text search
    if (searchTerm && searchFields.length > 0) {
      const searchConditions = searchFields
        .map((field, index) => `entity.${field} ILIKE :searchTerm${index}`)
        .join(' OR ');

      queryBuilder.andWhere(`(${searchConditions})`, {
        ...searchFields.reduce(
          (acc, _, index) => ({
            ...acc,
            [`searchTerm${index}`]: `%${searchTerm}%`,
          }),
          {},
        ),
      });
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          queryBuilder.andWhere(`entity.${key} IN (:...${key})`, {
            [key]: value,
          });
        } else {
          queryBuilder.andWhere(`entity.${key} = :${key}`, { [key]: value });
        }
      }
    });

    // Apply date range
    if (dateRange) {
      const { field, from, to } = dateRange;
      if (from) {
        queryBuilder.andWhere(`entity.${field} >= :dateFrom`, {
          dateFrom: from,
        });
      }
      if (to) {
        queryBuilder.andWhere(`entity.${field} <= :dateTo`, { dateTo: to });
      }
    }
  }

  /**
   * 🎯 Safe Create Entity
   */
  static async safeCreate<T>(
    repository: Repository<T>,
    data: DeepPartial<T>,
    uniqueFields: string[] = [],
  ): Promise<T> {
    try {
      // Check for duplicates
      if (uniqueFields.length > 0) {
        for (const field of uniqueFields) {
          const fieldValue = (data as any)[field];
          if (fieldValue) {
            const existing = await repository.findOne({
              where: { [field]: fieldValue } as FindOptionsWhere<T>,
            });
            if (existing) {
              throw new BadRequestException(
                `${field} already exists: ${fieldValue}`,
              );
            }
          }
        }
      }

      const entity = repository.create(data);
      return (await repository.save(entity)) as T;
    } catch (error) {
      this.logger.error('Create entity error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create entity');
    }
  }

  /**
   * 🎯 Safe Update Entity
   */
  static async safeUpdate<T>(
    repository: Repository<T>,
    id: string,
    data: any,
    uniqueFields: string[] = [],
  ): Promise<T> {
    try {
      const entity = await repository.findOne({
        where: { id } as any,
      });

      if (!entity) {
        throw new BadRequestException('Entity not found');
      }

      // Check for duplicates (excluding current entity)
      if (uniqueFields.length > 0) {
        for (const field of uniqueFields) {
          const fieldValue = data[field];
          if (fieldValue) {
            const existing = await repository.findOne({
              where: { [field]: fieldValue } as any,
            });
            if (existing && (existing as any).id !== id) {
              throw new BadRequestException(
                `${field} already exists: ${fieldValue}`,
              );
            }
          }
        }
      }

      Object.assign(entity, data);
      return await repository.save(entity);
    } catch (error) {
      this.logger.error('Update entity error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update entity');
    }
  }

  /**
   * 🎯 Safe Delete Entity
   */
  static async safeDelete<T>(
    repository: Repository<T>,
    id: string,
  ): Promise<boolean> {
    try {
      const result = await repository.delete(id);
      return result.affected > 0;
    } catch (error) {
      this.logger.error('Delete entity error:', error);
      throw new InternalServerErrorException('Failed to delete entity');
    }
  }

  /**
   * 🎯 Bulk Operations
   */
  static async bulkCreate<T>(
    repository: Repository<T>,
    data: any[],
    chunkSize: number = 1000,
  ): Promise<T[]> {
    try {
      const results: T[] = [];

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const entities = repository.create(chunk as any);
        const savedEntities = await repository.save(entities as any);
        results.push(...savedEntities);
      }

      return results;
    } catch (error) {
      this.logger.error('Bulk create error:', error);
      throw new InternalServerErrorException('Failed to bulk create entities');
    }
  }

  /**
   * 🎯 Count with Filters
   */
  static async countWithFilters<T>(
    repository: Repository<T>,
    searchOptions: SearchOptions = {},
  ): Promise<number> {
    try {
      const queryBuilder = repository.createQueryBuilder('entity');
      this.applySearch(queryBuilder, searchOptions);
      return await queryBuilder.getCount();
    } catch (error) {
      this.logger.error('Count with filters error:', error);
      throw new InternalServerErrorException('Failed to count entities');
    }
  }

  /**
   * 🎯 Check if Entity Exists
   */
  static async exists<T>(
    repository: Repository<T>,
    conditions: any,
  ): Promise<boolean> {
    try {
      const count = await repository.count({ where: conditions });
      return count > 0;
    } catch (error) {
      this.logger.error('Check exists error:', error);
      return false;
    }
  }

  /**
   * 🎯 Find or Create Entity
   */
  static async findOrCreate<T>(
    repository: Repository<T>,
    conditions: any,
    defaults: any,
  ): Promise<{ entity: T; created: boolean }> {
    try {
      const entity = await repository.findOne({ where: conditions });

      if (entity) {
        return { entity, created: false };
      }

      const newEntity = repository.create({
        ...conditions,
        ...defaults,
      } as any);
      const savedEntity = await repository.save(newEntity);
      const resultEntity = Array.isArray(savedEntity)
        ? savedEntity[0]
        : savedEntity;

      return { entity: resultEntity, created: true };
    } catch (error) {
      this.logger.error('Find or create error:', error);
      throw new InternalServerErrorException('Failed to find or create entity');
    }
  }
}
