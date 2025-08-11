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

const execAsync = promisify(exec);

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

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
    this.logger.log(`Webhook received from IP: ${clientIp}`);

    try {
      // Basic security checks
      const userAgent = headers['user-agent'];

      // Validate User-Agent (should be from GitHub)
      if (!userAgent || !userAgent.includes('GitHub-Hookshot')) {
        this.logger.warn(
          `Invalid User-Agent: ${userAgent} from IP: ${clientIp}`,
        );
        throw new UnauthorizedException('Invalid webhook source');
      }

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
      if (!payload.repository || !payload.commits) {
        this.logger.warn(`Invalid webhook payload from IP: ${clientIp}`);
        return { status: 'error', message: 'Invalid payload' };
      }

      const repoName = payload.repository.name;
      const branch = payload.ref?.replace('refs/heads/', '') || 'unknown';
      const commits = payload.commits?.length || 0;

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
      this.logger.log(`Initiating deployment for ${repoName}:${branch}`);

      // Execute deployment script in background
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
      this.logger.log('Starting background deployment...');

      const { stdout, stderr } = await execAsync(
        '/var/www/backend/ticket-backend/scripts/webhook-deploy.sh',
      );

      if (stdout) this.logger.log(`Deployment output: ${stdout}`);
      if (stderr) this.logger.warn(`Deployment warnings: ${stderr}`);

      this.logger.log('Deployment completed successfully');
    } catch (error) {
      this.logger.error('Deployment failed:', error);
    }
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook() {
    this.logger.log('Test webhook endpoint called');
    return { status: 'success', message: 'Webhook endpoint is working' };
  }
}
