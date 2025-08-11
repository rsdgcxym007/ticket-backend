import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
  }>;
}

export interface PushSubscription {
  userId: string;
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
}

@Injectable()
export class PWAService {
  private readonly logger = new Logger(PWAService.name);
  private subscriptions = new Map<string, PushSubscription[]>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {
    this.logger.log('PWA Service initialized');

    // Only configure VAPID keys in production or when explicitly provided
    if (
      process.env.NODE_ENV === 'production' ||
      (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    ) {
      this.configureVapidKeys();
    } else {
      this.logger.warn(
        'VAPID keys not configured - push notifications will be mocked in test environment',
      );
    }
  }

  private configureVapidKeys() {
    try {
      webpush.setVapidDetails(
        'mailto:admin@ticket-system.com',
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
      );
      this.logger.log('VAPID keys configured successfully');
    } catch (error) {
      this.logger.error(`Failed to configure VAPID keys: ${error.message}`);
    }
  }

  /**
   * Get PWA manifest configuration
   */
  getPWAManifest(): PWAConfig {
    return {
      name: 'Boxing Ticket Booking System',
      shortName: 'BoxingTix',
      description: 'Professional boxing event ticket booking platform',
      themeColor: '#1976d2',
      backgroundColor: '#ffffff',
      icons: [
        {
          src: '/icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png',
        },
        {
          src: '/icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png',
        },
        {
          src: '/icons/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png',
        },
        {
          src: '/icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
        },
        {
          src: '/icons/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png',
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    };
  }

  /**
   * Generate service worker script for offline functionality
   */
  getServiceWorkerScript(): string {
    return `
const CACHE_NAME = 'boxing-ticket-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/api/events',
  '/api/zones',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Boxing Ticket Update', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app to a specific page
    event.waitUntil(
      clients.openWindow('/events')
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Sync offline actions when connection is restored
  console.log('Background sync triggered');
  // Implementation would sync any queued actions
}
`;
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribeToPushNotifications(
    userId: string,
    subscription: Omit<PushSubscription, 'userId'>,
  ): Promise<boolean> {
    try {
      const userSubscriptions = this.subscriptions.get(userId) || [];

      // Check if subscription already exists
      const existingIndex = userSubscriptions.findIndex(
        (sub) => sub.endpoint === subscription.endpoint,
      );

      if (existingIndex >= 0) {
        // Update existing subscription
        userSubscriptions[existingIndex] = { userId, ...subscription };
      } else {
        // Add new subscription
        userSubscriptions.push({ userId, ...subscription });
      }

      this.subscriptions.set(userId, userSubscriptions);
      this.logger.log(`User ${userId} subscribed to push notifications`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to subscribe user ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribeFromPushNotifications(
    userId: string,
    endpoint: string,
  ): Promise<boolean> {
    try {
      const userSubscriptions = this.subscriptions.get(userId) || [];
      const filteredSubscriptions = userSubscriptions.filter(
        (sub) => sub.endpoint !== endpoint,
      );

      this.subscriptions.set(userId, filteredSubscriptions);
      this.logger.log(`User ${userId} unsubscribed from push notifications`);

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendPushNotification(
    userId: string,
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
  ): Promise<boolean> {
    try {
      const userSubscriptions = this.subscriptions.get(userId) || [];

      if (userSubscriptions.length === 0) {
        this.logger.warn(`No push subscriptions found for user ${userId}`);
        return false;
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72x72.png',
        data: notification.data || {},
        actions: notification.actions || [],
      });

      const promises = userSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys,
            },
            payload,
          );
          return true;
        } catch (error) {
          this.logger.error(
            `Failed to send notification to ${subscription.endpoint}: ${error.message}`,
          );
          return false;
        }
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((result) => result).length;

      this.logger.log(
        `Sent notifications to ${successCount}/${userSubscriptions.length} devices for user ${userId}`,
      );

      return successCount > 0;
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async broadcastPushNotification(
    userIds: string[],
    notification: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      data?: any;
    },
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    const promises = userIds.map(async (userId) => {
      const success = await this.sendPushNotification(userId, notification);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    });

    await Promise.all(promises);

    this.logger.log(`Broadcast notification: ${sent} sent, ${failed} failed`);

    return { sent, failed };
  }

  /**
   * Get offline capabilities configuration
   */
  getOfflineConfig(): any {
    return {
      cacheStrategy: 'cache-first',
      cacheableRoutes: [
        '/api/events',
        '/api/zones',
        '/api/user/profile',
        '/api/orders/history',
      ],
      offlinePages: ['/offline', '/events', '/profile'],
      syncStrategies: {
        bookmarks: 'background-sync',
        preferences: 'immediate',
        analytics: 'background-sync',
      },
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 50 * 1024 * 1024, // 50MB
    };
  }

  /**
   * Get PWA installation prompt data
   */
  getInstallPromptData(): any {
    return {
      criteria: [
        'served-over-https',
        'has-manifest',
        'has-service-worker',
        'meets-installability-requirements',
      ],
      benefits: [
        'Faster loading times',
        'Offline access to your bookings',
        'Push notifications for event updates',
        'App-like experience',
        'Works on all devices',
      ],
      installSteps: {
        android: [
          'Tap the menu button in your browser',
          'Select "Add to Home screen"',
          'Follow the prompts to install',
        ],
        ios: [
          'Tap the share button in Safari',
          'Select "Add to Home Screen"',
          'Tap "Add" to install',
        ],
        desktop: [
          'Look for the install icon in your address bar',
          'Click the install button',
          'Follow the installation prompts',
        ],
      },
    };
  }

  /**
   * Get push notification statistics
   */
  getPushNotificationStats(): any {
    let totalSubscriptions = 0;
    let activeUsers = 0;

    for (const [userId, subscriptions] of this.subscriptions.entries()) {
      totalSubscriptions += subscriptions.length;
      if (subscriptions.length > 0) {
        activeUsers++;
      }
    }

    return {
      totalSubscriptions,
      activeUsers,
      averageSubscriptionsPerUser:
        activeUsers > 0 ? totalSubscriptions / activeUsers : 0,
      platformDistribution: this.getPlatformDistribution(),
      lastUpdated: new Date().toISOString(),
    };
  }

  private getPlatformDistribution(): any {
    const platforms = { android: 0, ios: 0, desktop: 0, other: 0 };

    for (const subscriptions of this.subscriptions.values()) {
      for (const subscription of subscriptions) {
        const userAgent = subscription.deviceInfo?.userAgent || '';
        if (userAgent.includes('Android')) {
          platforms.android++;
        } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
          platforms.ios++;
        } else if (
          userAgent.includes('Windows') ||
          userAgent.includes('Mac') ||
          userAgent.includes('Linux')
        ) {
          platforms.desktop++;
        } else {
          platforms.other++;
        }
      }
    }

    return platforms;
  }
}
