import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PWAService } from './pwa.service';

@ApiTags('PWA (Progressive Web App)')
@Controller('pwa')
export class PWAController {
  constructor(private readonly pwaService: PWAService) {}

  @Get('manifest.json')
  @ApiOperation({
    summary: 'Get PWA manifest',
    description: 'Get the Progressive Web App manifest configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'PWA manifest retrieved successfully',
  })
  getManifest(@Res() res: Response) {
    const manifest = this.pwaService.getPWAManifest();
    res.set('Content-Type', 'application/json');
    return res.status(HttpStatus.OK).json(manifest);
  }

  @Get('service-worker.js')
  @ApiOperation({
    summary: 'Get service worker script',
    description: 'Get the service worker JavaScript for offline functionality',
  })
  @ApiResponse({
    status: 200,
    description: 'Service worker script retrieved successfully',
  })
  getServiceWorker(@Res() res: Response) {
    const script = this.pwaService.getServiceWorkerScript();
    res.set('Content-Type', 'application/javascript');
    return res.status(HttpStatus.OK).send(script);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Subscribe to push notifications',
    description: 'Subscribe user to push notifications for the PWA',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully subscribed to push notifications',
  })
  async subscribeToPush(
    @Body()
    body: {
      userId: string;
      subscription: {
        endpoint: string;
        keys: {
          p256dh: string;
          auth: string;
        };
        deviceInfo?: {
          userAgent: string;
          platform: string;
          language: string;
        };
      };
    },
  ) {
    const success = await this.pwaService.subscribeToPushNotifications(
      body.userId,
      body.subscription,
    );

    return {
      success,
      message: success
        ? 'Successfully subscribed to push notifications'
        : 'Failed to subscribe to push notifications',
    };
  }

  @Post('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Unsubscribe from push notifications',
    description: 'Unsubscribe user from push notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully unsubscribed from push notifications',
  })
  async unsubscribeFromPush(
    @Body()
    body: {
      userId: string;
      endpoint: string;
    },
  ) {
    const success = await this.pwaService.unsubscribeFromPushNotifications(
      body.userId,
      body.endpoint,
    );

    return {
      success,
      message: success
        ? 'Successfully unsubscribed from push notifications'
        : 'Failed to unsubscribe from push notifications',
    };
  }

  @Post('send-notification/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Send push notification to user',
    description: 'Send a push notification to a specific user',
  })
  @ApiResponse({
    status: 200,
    description: 'Push notification sent successfully',
  })
  async sendNotification(
    @Param('userId') userId: string,
    @Body()
    notification: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      data?: any;
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
    },
  ) {
    const success = await this.pwaService.sendPushNotification(
      userId,
      notification,
    );

    return {
      success,
      message: success
        ? 'Push notification sent successfully'
        : 'Failed to send push notification',
    };
  }

  @Post('broadcast-notification')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Broadcast push notification',
    description: 'Send a push notification to multiple users',
  })
  @ApiResponse({
    status: 200,
    description: 'Broadcast notification sent successfully',
  })
  async broadcastNotification(
    @Body()
    body: {
      userIds: string[];
      notification: {
        title: string;
        body: string;
        icon?: string;
        badge?: string;
        data?: any;
      };
    },
  ) {
    const result = await this.pwaService.broadcastPushNotification(
      body.userIds,
      body.notification,
    );

    return {
      ...result,
      message: `Broadcast completed: ${result.sent} sent, ${result.failed} failed`,
    };
  }

  @Get('offline-config')
  @ApiOperation({
    summary: 'Get offline configuration',
    description: 'Get PWA offline capabilities configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Offline configuration retrieved successfully',
  })
  getOfflineConfig() {
    return this.pwaService.getOfflineConfig();
  }

  @Get('install-prompt')
  @ApiOperation({
    summary: 'Get PWA installation prompt data',
    description: 'Get data for showing PWA installation prompts',
  })
  @ApiResponse({
    status: 200,
    description: 'Installation prompt data retrieved successfully',
  })
  getInstallPromptData() {
    return this.pwaService.getInstallPromptData();
  }

  @Get('stats/push-notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get push notification statistics',
    description: 'Get statistics about push notification subscriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Push notification statistics retrieved successfully',
  })
  getPushNotificationStats() {
    return this.pwaService.getPushNotificationStats();
  }

  @Get('capabilities')
  @ApiOperation({
    summary: 'Get PWA capabilities',
    description: 'Get information about PWA features and capabilities',
  })
  @ApiResponse({
    status: 200,
    description: 'PWA capabilities retrieved successfully',
  })
  getPWACapabilities() {
    return {
      features: {
        offline: {
          enabled: true,
          description: 'App works offline with cached content',
          strategies: ['cache-first', 'network-first', 'background-sync'],
        },
        pushNotifications: {
          enabled: true,
          description: 'Real-time notifications for bookings and events',
          types: ['booking-confirmation', 'event-reminders', 'promotions'],
        },
        installable: {
          enabled: true,
          description: 'Can be installed as a native-like app',
          platforms: ['Android', 'iOS', 'Windows', 'macOS', 'Linux'],
        },
        backgroundSync: {
          enabled: true,
          description: 'Sync data when connection is restored',
          actions: ['booking-submission', 'preference-updates'],
        },
        homeScreenShortcut: {
          enabled: true,
          description: 'Add to home screen for quick access',
          customization: ['icon', 'name', 'theme-color'],
        },
      },
      performance: {
        caching: 'Aggressive caching for faster load times',
        bundleSize: 'Optimized JavaScript bundles',
        lazyLoading: 'Components loaded on demand',
        compression: 'Gzip compression enabled',
      },
      security: {
        https: 'Required for PWA features',
        csp: 'Content Security Policy implemented',
        encryption: 'Data encrypted in transit and at rest',
      },
      compatibility: {
        browsers: [
          'Chrome 67+',
          'Firefox 60+',
          'Safari 11.1+',
          'Edge 17+',
          'Opera 54+',
        ],
        mobile: ['Android 5+', 'iOS 11.3+'],
        desktop: ['Windows 10', 'macOS 10.13+', 'Linux (modern)'],
      },
    };
  }
}
