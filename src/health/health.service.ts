import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly connection: Connection,
  ) {}

  async getHealthStatus() {
    const memoryUsage = process.memoryUsage();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      database: await this.getDatabaseStatus(),
      memory: {
        used: `${Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100} MB`,
        total: `${Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100} MB`,
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  async getDatabaseHealth() {
    try {
      const isConnected = this.connection.isConnected;
      const queryResult = await this.connection.query('SELECT 1');

      return {
        status: isConnected && queryResult ? 'connected' : 'disconnected',
        connected: isConnected,
        queryTest: !!queryResult,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  getMemoryUsage() {
    const memoryUsage = process.memoryUsage();

    return {
      heap: {
        used: `${Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100} MB`,
        total: `${Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100} MB`,
      },
      external: `${Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100} MB`,
      rss: `${Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100} MB`,
      timestamp: new Date().toISOString(),
    };
  }

  private async getDatabaseStatus(): Promise<string> {
    try {
      const isConnected = this.connection.isConnected;
      if (isConnected) {
        await this.connection.query('SELECT 1');
        return 'connected';
      }
      return 'disconnected';
    } catch {
      return 'error';
    }
  }
}
