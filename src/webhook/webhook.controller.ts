import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  @Post('deploy')
  @HttpCode(HttpStatus.OK)
  async handleDeploy(@Body() payload: any) {
    this.logger.log('Received deployment webhook');

    try {
      // Validate webhook payload (GitHub/GitLab format)
      if (!payload.repository || !payload.commits) {
        this.logger.warn('Invalid webhook payload received');
        return { status: 'error', message: 'Invalid payload' };
      }

      const repoName = payload.repository.name;
      const branch = payload.ref?.replace('refs/heads/', '') || 'unknown';
      const commits = payload.commits?.length || 0;

      this.logger.log(
        `Webhook from ${repoName}, branch: ${branch}, commits: ${commits}`,
      );

      // Only deploy from specific branch
      if (branch !== 'feature/newfunction') {
        this.logger.log(`Ignoring webhook from branch: ${branch}`);
        return {
          status: 'ignored',
          message: `Branch ${branch} not configured for auto-deployment`,
        };
      }

      // Execute deployment script in background
      this.executeDeployment();

      return {
        status: 'success',
        message: 'Deployment initiated',
        repository: repoName,
        branch: branch,
        commits: commits,
      };
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
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
