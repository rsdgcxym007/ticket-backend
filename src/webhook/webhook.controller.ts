import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

const execAsync = promisify(exec);

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly discordWebhookUrl: string;

  constructor(private configService: ConfigService) {
    this.discordWebhookUrl =
      this.configService.get('DISCORD_WEBHOOK_URL') ||
      'https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l';
  }

  // Validate GitHub webhook signature
  private validateGitHubSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const hash = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
      const expectedSignature = `sha256=${hash}`;

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8'),
      );
    } catch (error) {
      this.logger.error('Signature validation error:', error);
      return false;
    }
  }

  @Post('deploy')
  @HttpCode(HttpStatus.OK)
  async handleDeploy(
    @Body() payload: any,
    @Headers() headers: any,
    @Req() req: any,
  ) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = headers['user-agent'];

    this.logger.log(
      `🔄 Webhook received from IP: ${clientIp}, User-Agent: ${userAgent}`,
    );

    try {
      // Basic security checks

      // GitHub webhook IP ranges (approximate common ranges)
      const isGitHubIP =
        clientIp.startsWith('140.82.') || // GitHub primary range
        clientIp.startsWith('192.30.') || // GitHub secondary range
        clientIp.startsWith('185.199.') || // GitHub CDN range
        clientIp.startsWith('124.122.') || // GitHub Asia range
        clientIp.startsWith('13.229.') || // GitHub AWS range
        clientIp.startsWith('52.74.'); // GitHub AWS Singapore

      // Validate User-Agent (should be from GitHub or internal deployment scripts)
      const isValidUserAgent =
        userAgent &&
        (userAgent.includes('GitHub-Hookshot') ||
          userAgent.includes('curl') ||
          userAgent.includes('axios') ||
          userAgent.includes('node'));

      // Allow if valid user agent OR from known IPs
      const isValidSource =
        isValidUserAgent ||
        isGitHubIP ||
        clientIp === '43.229.133.51' || // Allow from server IP
        clientIp.includes('127.0.0.1') || // Allow localhost
        clientIp.includes('::1'); // Allow IPv6 localhost

      if (!isValidSource) {
        this.logger.warn(
          `❌ Invalid source - User-Agent: ${userAgent}, IP: ${clientIp}, GitHub IP check: ${isGitHubIP}`,
        );
        throw new UnauthorizedException('Invalid webhook source');
      }

      this.logger.log(
        `✅ Valid webhook source - IP: ${clientIp}, User-Agent: ${userAgent}`,
      );

      // TODO: Add webhook secret validation (uncomment when secret is configured)
      // const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
      // if (webhookSecret && signature) {
      //   const isValid = this.validateGitHubSignature(
      //     JSON.stringify(payload),
      //     signature,
      //     webhookSecret,
      //   );
      //   if (!isValid) {
      //     this.logger.warn(`Invalid signature from IP: ${clientIp}`);
      //     throw new UnauthorizedException('Invalid webhook signature');
      //   }
      // }

      // Validate webhook payload (GitHub/GitLab format)
      // Allow internal server requests with minimal payload
      const isInternalRequest =
        clientIp === '43.229.133.51' ||
        clientIp.includes('127.0.0.1') ||
        clientIp.includes('::1');

      if (!isInternalRequest && (!payload.repository || !payload.commits)) {
        this.logger.warn(`Invalid webhook payload from IP: ${clientIp}`);
        return { status: 'error', message: 'Invalid payload' };
      }

      const repoName = payload.repository?.name || 'ticket-backend';
      const branch =
        payload.ref?.replace('refs/heads/', '') ||
        (isInternalRequest ? 'feature/newfunction' : 'unknown');
      const commits = payload.commits?.length || (isInternalRequest ? 1 : 0);

      this.logger.log(
        `Webhook from ${repoName}, branch: ${branch}, commits: ${commits}, IP: ${clientIp}`,
      );

      // Only deploy from specific branch
      if (branch !== 'feature/newfunction') {
        this.logger.log(`Ignoring webhook from branch: ${branch}`);
        return {
          status: 'ignored',
          message: `Branch ${branch} not configured for auto-deployment`,
        };
      }

      // Log deployment initiation
      this.logger.log(
        `🚀 Simple deployment for ${repoName}:${branch} (${isInternalRequest ? 'internal' : 'external'} request)`,
      );

      // Execute deployment script in background (fire and forget)
      this.executeDeployment();

      return {
        status: 'success',
        message: 'Deployment initiated',
        repository: repoName,
        branch: branch,
        commits: commits,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Webhook processing failed from IP: ${clientIp}:`,
        error,
      );
      return { status: 'error', message: 'Webhook processing failed' };
    }
  }

  private async executeDeployment() {
    try {
      this.logger.log('🚀 Starting deployment...');

      const projectDir = '/var/www/patong-boxing';

      // ขั้นตอนที่ 1: ดาวน์โหลดโค้ดใหม่
      this.logger.log('📥 Pulling latest code...');
      await execAsync(
        `cd ${projectDir} && git fetch origin && git reset --hard origin/feature/newfunction`,
      );

      // ขั้นตอนที่ 2: ติดตั้ง dependencies (ถ้าจำเป็น)
      this.logger.log('📦 Installing dependencies...');
      await execAsync(`cd ${projectDir} && npm ci --only=production`);

      // ขั้นตอนที่ 3: Build application
      this.logger.log('🔨 Building application...');
      await execAsync(`cd ${projectDir} && npm run build`);

      // ขั้นตอนที่ 4: Restart PM2
      this.logger.log('🔄 Restarting PM2 processes...');
      await execAsync('pm2 restart all --update-env');

      this.logger.log('✅ Deployment completed successfully');

      // ส่งการแจ้งเตือนความสำเร็จ
      await this.sendDiscordNotification({
        status: 'success',
        message: '✅ Deployment completed successfully!',
        branch: 'feature/newfunction',
        timestamp: new Date().toISOString(),
        environment: 'production',
      });
    } catch (error) {
      this.logger.error('❌ Deployment failed:', error);

      // ส่งการแจ้งเตือน error
      await this.sendDiscordNotification({
        status: 'failed',
        message: `❌ Deployment failed: ${error.message}`,
        branch: 'feature/newfunction',
        timestamp: new Date().toISOString(),
        environment: 'production',
      });

      throw error;
    }
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook() {
    this.logger.log('Test webhook endpoint called');
    return { status: 'success', message: 'Webhook endpoint is working' };
  }

  /**
   * 🚀 External deployment hook endpoint
   * รองรับ webhook จาก external deployment service
   */
  @Post('deploy-backend-master')
  @HttpCode(HttpStatus.OK)
  async handleExternalDeploy(
    @Body() payload: any,
    @Headers() headers: any,
    @Req() req: any,
  ) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = headers['user-agent'];

    this.logger.log(
      `🔄 External deployment webhook from IP: ${clientIp}, User-Agent: ${userAgent}`,
    );

    try {
      // Allow external deployment services
      this.logger.log(`✅ External deployment initiated from IP: ${clientIp}`);

      // Execute deployment
      this.executeDeployment();

      // Send Discord notification
      await this.sendDiscordNotification({
        status: 'started',
        message: '🚀 Auto-deployment started from external service',
        branch: 'feature/newfunction',
        timestamp: new Date().toISOString(),
        commit: payload.commit?.substring(0, 8) || 'latest',
        version: payload.version || '1.0.0',
        environment: 'production',
      });

      return {
        status: 'success',
        message: 'External deployment initiated',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `External deployment failed from IP: ${clientIp}:`,
        error,
      );

      // Send error notification
      await this.sendDiscordNotification({
        status: 'failed',
        message: `❌ Auto-deployment failed: ${error.message}`,
        branch: 'feature/newfunction',
        timestamp: new Date().toISOString(),
        environment: 'production',
      });

      return { status: 'error', message: 'External deployment failed' };
    }
  }

  /**
   * 🚀 Deployment notification webhook
   * รับการแจ้งเตือนจาก deployment และส่งต่อไป Discord
   */
  @Post('v1/deploy')
  @HttpCode(HttpStatus.OK)
  async handleDeploymentNotification(@Body() payload: any) {
    try {
      this.logger.log('🚀 Deployment notification received:', payload);

      const {
        status = 'unknown',
        message = 'Deployment notification',
        branch = 'unknown',
        timestamp = new Date().toISOString(),
        commit = '',
        version = '',
        environment = 'production',
      } = payload;

      // ส่งไป Discord
      await this.sendDiscordNotification({
        status,
        message,
        branch,
        timestamp,
        commit,
        version,
        environment,
      });

      return {
        success: true,
        message: 'Deployment notification processed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to process deployment notification:', error);
      return {
        success: false,
        message: 'Failed to process notification',
        error: error.message,
      };
    }
  }

  /**
   * 📱 Send Discord notification
   * ส่งการแจ้งเตือนไป Discord
   */
  private async sendDiscordNotification(deployInfo: any): Promise<void> {
    try {
      const {
        status,
        message,
        branch,
        timestamp,
        commit,
        version,
        environment,
      } = deployInfo;

      // กำหนดสีตาม status
      let color = 16776960; // Yellow (default)
      let emoji = '🟡';

      switch (status.toLowerCase()) {
        case 'success':
        case 'completed':
        case 'deployed':
          color = 5763719; // Green
          emoji = '✅';
          break;
        case 'failed':
        case 'error':
          color = 15158332; // Red
          emoji = '❌';
          break;
        case 'started':
        case 'deploying':
          color = 3447003; // Blue
          emoji = '🚀';
          break;
        case 'warning':
          color = 16776960; // Yellow
          emoji = '⚠️';
          break;
      }

      const embed = {
        title: `${emoji} Stadium Backend Deployment`,
        description: message,
        color: color,
        fields: [
          {
            name: '📊 Status',
            value: status.toUpperCase(),
            inline: true,
          },
          {
            name: '🌿 Branch',
            value: branch,
            inline: true,
          },
          {
            name: '🌍 Environment',
            value: environment,
            inline: true,
          },
          {
            name: '⏰ Timestamp',
            value: new Date(timestamp).toLocaleString('th-TH'),
            inline: true,
          },
        ],
        footer: {
          text: 'Stadium Ticket System',
        },
        timestamp: timestamp,
      };

      // เพิ่ม commit และ version ถ้ามี
      if (commit) {
        embed.fields.push({
          name: '📝 Commit',
          value: commit.substring(0, 8),
          inline: true,
        });
      }

      if (version) {
        embed.fields.push({
          name: '🏷️ Version',
          value: version,
          inline: true,
        });
      }

      const discordPayload = {
        embeds: [embed],
      };

      // ส่งไป Discord
      const response = await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discordPayload),
      });

      if (response.ok) {
        this.logger.log('✅ Discord notification sent successfully');
      } else {
        this.logger.error(`❌ Discord notification failed: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to send Discord notification:', error);
    }
  }
}
