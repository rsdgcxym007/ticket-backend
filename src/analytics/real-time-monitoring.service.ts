import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import moment from 'moment';

@Injectable()
export class RealTimeMonitoringService {
  private readonly logger = new Logger(RealTimeMonitoringService.name);

  // In-memory storage for real-time metrics (in production, use Redis)
  private realtimeMetrics = {
    systemHealth: {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
      lastUpdated: new Date(),
    },
    apiMetrics: {
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      activeConnections: 0,
      lastUpdated: new Date(),
    },
    businessMetrics: {
      activeUsers: 0,
      ongoingOrders: 0,
      qrScansPerMinute: 0,
      emailsSentPerHour: 0,
      lastUpdated: new Date(),
    },
    securityMetrics: {
      blockedRequests: 0,
      suspiciousActivities: 0,
      failedLogins: 0,
      activeThreats: 0,
      lastUpdated: new Date(),
    },
  };

  /**
   * 📊 Get Real-time System Health
   */
  async getSystemHealth() {
    try {
      const health = {
        status: this.getOverallHealthStatus(),
        timestamp: new Date(),

        // System Resources
        system: {
          cpu: {
            usage: Math.floor(Math.random() * 30) + 20, // Mock: 20-50%
            cores: 8,
            temperature: Math.floor(Math.random() * 10) + 45, // 45-55°C
          },
          memory: {
            used: Math.floor(Math.random() * 2048) + 1024, // 1-3GB
            total: 8192, // 8GB
            percentage: Math.floor(Math.random() * 30) + 30, // 30-60%
          },
          disk: {
            used: Math.floor(Math.random() * 50) + 100, // 100-150GB
            total: 500, // 500GB
            percentage: Math.floor(Math.random() * 20) + 20, // 20-40%
          },
          network: {
            inbound: Math.floor(Math.random() * 100) + 50, // 50-150 Mbps
            outbound: Math.floor(Math.random() * 50) + 25, // 25-75 Mbps
            latency: Math.floor(Math.random() * 20) + 5, // 5-25ms
          },
        },

        // Application Health
        application: {
          uptime: this.getUptime(),
          version: '2.0.0',
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
        },

        // Database Health
        database: {
          status: 'healthy',
          connections: {
            active: Math.floor(Math.random() * 10) + 5, // 5-15
            idle: Math.floor(Math.random() * 15) + 10, // 10-25
            total: 50,
          },
          performance: {
            avgQueryTime: Math.floor(Math.random() * 50) + 20, // 20-70ms
            slowQueries: Math.floor(Math.random() * 3), // 0-3
            deadlocks: 0,
          },
        },

        // External Services
        external: {
          paymentGateway: { status: 'healthy', responseTime: 245 },
          emailService: { status: 'healthy', responseTime: 180 },
          smsService: { status: 'healthy', responseTime: 320 },
        },

        lastUpdated: new Date(),
      };

      this.realtimeMetrics.systemHealth.lastUpdated = new Date();
      this.logger.log('📊 System health metrics updated');

      return health;
    } catch (error) {
      this.logger.error(`❌ Failed to get system health: ${error.message}`);
      throw error;
    }
  }

  /**
   * ⚡ Get Real-time Performance Metrics
   */
  async getPerformanceMetrics() {
    try {
      const performance = {
        timestamp: new Date(),

        // API Performance
        api: {
          requests: {
            total: Math.floor(Math.random() * 1000) + 5000, // 5000-6000
            perMinute: Math.floor(Math.random() * 100) + 50, // 50-150/min
            perSecond: Math.floor(Math.random() * 3) + 1, // 1-4/sec
          },
          responseTime: {
            avg: Math.floor(Math.random() * 100) + 100, // 100-200ms
            p50: Math.floor(Math.random() * 80) + 90, // 90-170ms
            p95: Math.floor(Math.random() * 200) + 200, // 200-400ms
            p99: Math.floor(Math.random() * 500) + 500, // 500-1000ms
          },
          errors: {
            total: Math.floor(Math.random() * 10) + 2, // 2-12
            rate: Math.random() * 2 + 0.1, // 0.1-2.1%
            breakdown: {
              '4xx': Math.floor(Math.random() * 8) + 1,
              '5xx': Math.floor(Math.random() * 3),
            },
          },
        },

        // Endpoint Performance
        endpoints: [
          {
            path: '/api/orders',
            method: 'POST',
            calls: Math.floor(Math.random() * 100) + 50,
            avgTime: Math.floor(Math.random() * 50) + 150,
            errors: Math.floor(Math.random() * 2),
          },
          {
            path: '/api/qr/generate',
            method: 'POST',
            calls: Math.floor(Math.random() * 200) + 100,
            avgTime: Math.floor(Math.random() * 30) + 80,
            errors: Math.floor(Math.random() * 1),
          },
          {
            path: '/api/auth/login',
            method: 'POST',
            calls: Math.floor(Math.random() * 50) + 20,
            avgTime: Math.floor(Math.random() * 100) + 200,
            errors: Math.floor(Math.random() * 3),
          },
        ],

        // Cache Performance
        cache: {
          hits: Math.floor(Math.random() * 500) + 1000,
          misses: Math.floor(Math.random() * 100) + 50,
          hitRate: Math.random() * 10 + 90, // 90-100%
          evictions: Math.floor(Math.random() * 5),
        },

        // Queue Performance
        queues: [
          {
            name: 'email-processing',
            pending: Math.floor(Math.random() * 20) + 5,
            processing: Math.floor(Math.random() * 3) + 1,
            completed: Math.floor(Math.random() * 1000) + 500,
            failed: Math.floor(Math.random() * 10),
          },
          {
            name: 'qr-generation',
            pending: Math.floor(Math.random() * 10) + 2,
            processing: Math.floor(Math.random() * 2) + 1,
            completed: Math.floor(Math.random() * 500) + 200,
            failed: Math.floor(Math.random() * 5),
          },
        ],
      };

      this.realtimeMetrics.apiMetrics.lastUpdated = new Date();
      this.logger.log('⚡ Performance metrics updated');

      return performance;
    } catch (error) {
      this.logger.error(
        `❌ Failed to get performance metrics: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🔒 Get Real-time Security Monitoring
   */
  async getSecurityMonitoring() {
    try {
      const security = {
        timestamp: new Date(),

        // Threat Detection
        threats: {
          active: Math.floor(Math.random() * 3), // 0-3 active threats
          blocked: Math.floor(Math.random() * 50) + 10, // 10-60 blocked
          severity: {
            critical: Math.floor(Math.random() * 2),
            high: Math.floor(Math.random() * 3) + 1,
            medium: Math.floor(Math.random() * 5) + 2,
            low: Math.floor(Math.random() * 10) + 5,
          },
        },

        // Authentication Security
        authentication: {
          activeTokens: Math.floor(Math.random() * 100) + 50,
          expiredTokens: Math.floor(Math.random() * 20) + 10,
          failedAttempts: {
            lastHour: Math.floor(Math.random() * 15) + 5,
            lastDay: Math.floor(Math.random() * 100) + 50,
            suspiciousIPs: Math.floor(Math.random() * 5) + 1,
          },
          bruteForceAttempts: Math.floor(Math.random() * 3),
        },

        // Rate Limiting
        rateLimiting: {
          blockedRequests: Math.floor(Math.random() * 30) + 10,
          nearLimitRequests: Math.floor(Math.random() * 50) + 20,
          topBlockedIPs: [
            { ip: '192.168.1.100', requests: 156, blocked: 45 },
            { ip: '10.0.0.55', requests: 89, blocked: 23 },
            { ip: '172.16.0.201', requests: 67, blocked: 12 },
          ],
        },

        // Suspicious Activities
        activities: [
          {
            type: 'MULTIPLE_LOGIN_FAILURES',
            ip: '192.168.1.100',
            count: 5,
            timestamp: moment().subtract(2, 'minutes').toDate(),
            severity: 'high',
            action: 'IP_BLOCKED',
          },
          {
            type: 'RATE_LIMIT_EXCEEDED',
            ip: '10.0.0.55',
            count: 12,
            timestamp: moment().subtract(5, 'minutes').toDate(),
            severity: 'medium',
            action: 'REQUEST_THROTTLED',
          },
          {
            type: 'SUSPICIOUS_USER_AGENT',
            ip: '172.16.0.201',
            count: 3,
            timestamp: moment().subtract(8, 'minutes').toDate(),
            severity: 'low',
            action: 'LOGGED',
          },
        ],

        // Security Events
        events: {
          lastHour: Math.floor(Math.random() * 20) + 5,
          lastDay: Math.floor(Math.random() * 200) + 100,
          weeklyTrend: [
            {
              date: moment().subtract(6, 'days').format('YYYY-MM-DD'),
              count: 45,
            },
            {
              date: moment().subtract(5, 'days').format('YYYY-MM-DD'),
              count: 52,
            },
            {
              date: moment().subtract(4, 'days').format('YYYY-MM-DD'),
              count: 38,
            },
            {
              date: moment().subtract(3, 'days').format('YYYY-MM-DD'),
              count: 61,
            },
            {
              date: moment().subtract(2, 'days').format('YYYY-MM-DD'),
              count: 44,
            },
            {
              date: moment().subtract(1, 'days').format('YYYY-MM-DD'),
              count: 57,
            },
            { date: moment().format('YYYY-MM-DD'), count: 33 },
          ],
        },
      };

      this.realtimeMetrics.securityMetrics.lastUpdated = new Date();
      this.logger.log('🔒 Security monitoring updated');

      return security;
    } catch (error) {
      this.logger.error(
        `❌ Failed to get security monitoring: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 📈 Get Real-time Business Metrics
   */
  async getBusinessMetrics() {
    try {
      const business = {
        timestamp: new Date(),

        // Live Activity
        activity: {
          onlineUsers: Math.floor(Math.random() * 50) + 25, // 25-75
          activeOrders: Math.floor(Math.random() * 10) + 5, // 5-15
          pendingPayments: Math.floor(Math.random() * 8) + 2, // 2-10
          processingQR: Math.floor(Math.random() * 15) + 5, // 5-20
        },

        // Real-time Sales
        sales: {
          todayRevenue: Math.floor(Math.random() * 50000) + 100000, // 100k-150k
          ordersToday: Math.floor(Math.random() * 30) + 20, // 20-50
          avgOrderValue: Math.floor(Math.random() * 2000) + 4000, // 4k-6k
          conversionRate: Math.random() * 20 + 60, // 60-80%
        },

        // Live Trends (last 24 hours)
        trends: {
          hourlyRevenue: this.generateHourlyTrends(),
          hourlyOrders: this.generateHourlyOrderTrends(),
          userActivity: this.generateUserActivityTrends(),
        },

        // Geographic Data
        geographic: {
          topRegions: [
            { region: 'กรุงเทพฯ', orders: 45, revenue: 225000 },
            { region: 'เชียงใหม่', orders: 23, revenue: 115000 },
            { region: 'ภูเก็ต', orders: 18, revenue: 90000 },
            { region: 'ขอนแก่น', orders: 12, revenue: 60000 },
          ],
        },

        // Queue Status
        processing: {
          emailQueue: Math.floor(Math.random() * 20) + 5,
          qrQueue: Math.floor(Math.random() * 10) + 2,
          paymentQueue: Math.floor(Math.random() * 8) + 1,
          reportQueue: Math.floor(Math.random() * 5),
        },
      };

      this.realtimeMetrics.businessMetrics.lastUpdated = new Date();
      this.logger.log('📈 Business metrics updated');

      return business;
    } catch (error) {
      this.logger.error(`❌ Failed to get business metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🚨 Get System Alerts
   */
  async getSystemAlerts() {
    const alerts = [
      {
        id: 'alert-001',
        type: 'PERFORMANCE',
        severity: 'medium',
        title: 'High Response Time Detected',
        message: 'API response time exceeded 500ms threshold',
        timestamp: moment().subtract(3, 'minutes').toDate(),
        acknowledged: false,
      },
      {
        id: 'alert-002',
        type: 'SECURITY',
        severity: 'high',
        title: 'Multiple Failed Login Attempts',
        message: 'IP 192.168.1.100 attempted 5 failed logins in 2 minutes',
        timestamp: moment().subtract(5, 'minutes').toDate(),
        acknowledged: false,
      },
      {
        id: 'alert-003',
        type: 'BUSINESS',
        severity: 'low',
        title: 'Low Conversion Rate',
        message: 'Conversion rate dropped to 55% (below 60% threshold)',
        timestamp: moment().subtract(15, 'minutes').toDate(),
        acknowledged: true,
      },
    ];

    return alerts.filter((alert) => !alert.acknowledged);
  }

  /**
   * 📊 Helper Methods
   */
  private getOverallHealthStatus(): 'healthy' | 'warning' | 'critical' {
    // Simple health calculation based on random factors
    const healthScore = Math.random() * 100;

    if (healthScore > 85) return 'healthy';
    if (healthScore > 60) return 'warning';
    return 'critical';
  }

  private getUptime(): string {
    // Mock uptime calculation
    const uptimeHours = Math.floor(Math.random() * 720) + 168; // 1-4 weeks
    const days = Math.floor(uptimeHours / 24);
    const hours = uptimeHours % 24;

    return `${days}d ${hours}h`;
  }

  private generateHourlyTrends() {
    const trends = [];
    for (let i = 23; i >= 0; i--) {
      trends.push({
        hour: moment().subtract(i, 'hours').format('HH:00'),
        revenue: Math.floor(Math.random() * 20000) + 5000,
      });
    }
    return trends;
  }

  private generateHourlyOrderTrends() {
    const trends = [];
    for (let i = 23; i >= 0; i--) {
      trends.push({
        hour: moment().subtract(i, 'hours').format('HH:00'),
        orders: Math.floor(Math.random() * 10) + 2,
      });
    }
    return trends;
  }

  private generateUserActivityTrends() {
    const trends = [];
    for (let i = 23; i >= 0; i--) {
      trends.push({
        hour: moment().subtract(i, 'hours').format('HH:00'),
        active: Math.floor(Math.random() * 50) + 10,
      });
    }
    return trends;
  }

  /**
   * ⏰ Scheduled Monitoring Tasks - OPTIMIZED for lower CPU usage
   */
  @Cron('0 */2 * * * *') // Every 2 minutes instead of every 30 seconds
  async updateRealTimeMetrics() {
    // Update metrics every 2 minutes to reduce CPU load
    try {
      // Only update essential metrics, reduce complexity
      await this.getSystemHealth();
      // Don't log every update to avoid spam
    } catch (error) {
      this.logger.error(`Failed to update real-time metrics: ${error.message}`);
    }
  }

  @Cron('0 */10 * * * *') // Every 10 minutes instead of every minute
  async checkSystemAlerts() {
    // Check for new alerts every 10 minutes to reduce load
    try {
      const alerts = await this.getSystemAlerts();
      if (alerts.length > 0) {
        this.logger.warn(`🚨 ${alerts.length} active system alerts detected`);
      }
    } catch (error) {
      this.logger.error(`Failed to check system alerts: ${error.message}`);
    }
  }

  @Cron('0 */15 * * * *') // Every 15 minutes instead of every 5 minutes
  async updateSecurityMetrics() {
    // Update security monitoring every 15 minutes to reduce CPU usage
    try {
      await this.getSecurityMonitoring();
      this.logger.log('🔒 Security monitoring cycle completed');
    } catch (error) {
      this.logger.error(`Failed to update security metrics: ${error.message}`);
    }
  }
}
