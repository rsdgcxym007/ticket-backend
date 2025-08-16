import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

const execAsync = promisify(exec);

@ApiTags('🚨 Emergency Admin')
@Controller('api/v1/emergency')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmergencyController {
  /**
   * 🔓 Unban IP from Fail2ban
   */
  @Post('unban-ip')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Unban IP from Fail2ban',
    description: 'Remove IP ban from fail2ban and restart SSH service',
  })
  async unbanIP(@Body() body: { ip: string }) {
    const { ip } = body;

    try {
      // Unban IP from fail2ban
      await execAsync(`sudo fail2ban-client unban ${ip}`);

      // Restart SSH service
      await execAsync('sudo systemctl restart ssh');

      // Check SSH status
      const { stdout } = await execAsync(
        'sudo systemctl status ssh --no-pager',
      );

      return {
        success: true,
        message: `IP ${ip} unbanned and SSH restarted`,
        sshStatus: stdout,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to unban IP or restart SSH',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 🔧 Restart SSH Service
   */
  @Post('restart-ssh')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Restart SSH Service',
    description: 'Force restart SSH service and check status',
  })
  async restartSSH() {
    try {
      // Restart SSH service
      await execAsync('sudo systemctl restart ssh');
      await execAsync('sudo systemctl enable ssh');

      // Check SSH status
      const { stdout: sshStatus } = await execAsync(
        'sudo systemctl status ssh --no-pager',
      );
      const { stdout: portStatus } = await execAsync(
        'sudo ss -tulpn | grep :22',
      );

      return {
        success: true,
        message: 'SSH service restarted successfully',
        sshStatus,
        portStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to restart SSH service',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 📊 Check System Status
   */
  @Post('system-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Check System Status',
    description: 'Get comprehensive system status including banned IPs',
  })
  async getSystemStatus() {
    try {
      const { stdout: fail2banStatus } = await execAsync(
        'sudo fail2ban-client status sshd',
      );
      const { stdout: sshStatus } = await execAsync(
        'sudo systemctl status ssh --no-pager',
      );
      const { stdout: ufwStatus } = await execAsync('sudo ufw status');
      const { stdout: portStatus } = await execAsync(
        'sudo ss -tulpn | grep :22',
      );

      return {
        success: true,
        data: {
          fail2ban: fail2banStatus,
          ssh: sshStatus,
          firewall: ufwStatus,
          ports: portStatus,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get system status',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
