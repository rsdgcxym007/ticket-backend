// PM2 Ecosystem Configuration
// For production deployment on VPS (43.229.133.51)

module.exports = {
  apps: [
    {
      name: 'ticket-backend-prod',
      script: 'dist/main.js',
      instances: 1, // Single instance for production
      exec_mode: 'fork',
      cwd: '/var/www/backend/ticket-backend',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        PROJECT_DIR: '/var/www/backend/ticket-backend',

        // Domain Configuration
        FRONTEND_URL: 'https://patongboxingstadiumticket.com',
        BACKEND_URL: 'https://api.patongboxingstadiumticket.com',
        API_URL: 'https://api.patongboxingstadiumticket.com/api',

        // CORS Configuration
        CORS_ORIGIN: 'https://patongboxingstadiumticket.com',
        CORS_CREDENTIALS: true,

        // SSL/TLS Configuration
        FORCE_HTTPS: true,
        TRUST_PROXY: true,

        // Database Configuration
        DATABASE_HOST: '43.229.133.51',
        DATABASE_PORT: 5432,
        DATABASE_USERNAME: 'boxing_user',
        DATABASE_PASSWORD: 'Password123!',
        DATABASE_NAME: 'patong_boxing_stadium',
        DATABASE_SSL: false,
        DATABASE_SYNCHRONIZE: false,
        DATABASE_LOGGING: false,

        // Email Configuration
        GMAIL_USER: 'info@patongboxingstadiumticket.com',
        EMAIL_FROM: 'info@patongboxingstadiumticket.com',
        EMAIL_FROM_NAME: 'Patong Boxing Stadium',

        // Redis Configuration (Optional)
        REDIS_HOST: '43.229.133.51',
        REDIS_PORT: 6379,

        // JWT Configuration
        JWT_SECRET: 'prod-jwt-secret-key-change-this',
        JWT_REFRESH_SECRET: 'prod-jwt-refresh-secret-key-change-this',
        JWT_EXPIRATION: '7d',
        JWT_REFRESH_EXPIRATION: '30d',
        JWT_ISSUER: 'patongboxingstadiumticket.com',
        JWT_AUDIENCE: 'patongboxingstadiumticket.com',

        // Application Settings
        API_VERSION: 'v1',
        BCRYPT_ROUNDS: 12,
        RATE_LIMIT_TTL: 60000,
        RATE_LIMIT_LIMIT: 100,
        SWAGGER_ENABLED: true,

        // Security
        THROTTLE_TTL: 60,
        THROTTLE_LIMIT: 100,
        MAX_FILE_SIZE: 10485760,

        // Security Headers
        HELMET_ENABLED: true,
        CSP_ENABLED: true,
        HSTS_ENABLED: true,

        // Rate Limiting
        RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
        RATE_LIMIT_MAX_REQUESTS: 100, // limit each IP to 100 requests per windowMs

        // Performance
        ENABLE_COMPRESSION: true,
        ENABLE_CACHING: true,
        CACHE_TTL: 300,

        // Health Check
        HEALTH_CHECK_ENABLED: true,
        HEALTH_CHECK_DATABASE: true,
        HEALTH_CHECK_REDIS: true,

        // Webhook Configuration
        WEBHOOK_SECRET: 'webhook-secret-key-2025',
        GITHUB_WEBHOOK_URL:
          'http://43.229.133.51:4200/hooks/deploy-backend-master',
        DISCORD_WEBHOOK_URL:
          'https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l',

        // API Documentation
        SWAGGER_TITLE: 'Patong Boxing Stadium API',
        SWAGGER_DESCRIPTION: 'API for ticket booking and management system',
        SWAGGER_VERSION: '2.0',
        SWAGGER_CONTACT_EMAIL: 'info@patongboxingstadiumticket.com',

        // Session Configuration
        SESSION_SECRET: 'session-secret-key-2025',
        SESSION_MAX_AGE: 86400000, // 24 hours

        // File Upload Configuration
        UPLOAD_MAX_SIZE: '50mb',
        UPLOAD_ALLOWED_TYPES: 'image/jpeg,image/png,image/gif,application/pdf',
      },
      error_file: '/var/log/pm2/ticket-backend-error.log',
      out_file: '/var/log/pm2/ticket-backend-out.log',
      log_file: '/var/log/pm2/ticket-backend.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G', // Increased memory limit for better performance
      node_args:
        '--max-old-space-size=1024 --gc-interval=100 --enable-source-maps', // Updated Node.js args
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs', '.git', 'dist'],
      restart_delay: 3000,
      max_restarts: 15,
      min_uptime: '10s',
      kill_timeout: 10000,
      listen_timeout: 15000,

      // Graceful shutdown
      shutdown_with_message: true,
      wait_ready: true,

      // Auto restart on file change in production (disabled for stability)
      autorestart: true,

      // Cron restart (daily at 3 AM)
      cron_restart: '0 3 * * *',
    },

    // Webhook Server for GitHub Auto-Deploy
    {
      name: 'webhook-server',
      script: 'monitoring/webhook-server.js',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/var/www/backend/ticket-backend',
      env: {
        NODE_ENV: 'development',
        WEBHOOK_PORT: 4200,
        WEBHOOK_SECRET: 'webhook-secret-key-2025',
      },
      env_production: {
        NODE_ENV: 'production',
        WEBHOOK_PORT: 4200,
        WEBHOOK_SECRET: 'webhook-secret-key-2025',
      },
      error_file: '/var/log/pm2/webhook-server-error.log',
      out_file: '/var/log/pm2/webhook-server-out.log',
      log_file: '/var/log/pm2/webhook-server.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '200M',
      node_args: '--max-old-space-size=256',
      watch: false,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10,
      min_uptime: '5s',
    },
  ],

  deploy: {
    production: {
      user: 'root',
      host: '43.229.133.51',
      ref: 'origin/feature/newfunction',
      repo: 'git@github.com:rsdgcxym007/ticket-backend.git',
      path: '/var/www/backend/ticket-backend',
      'pre-deploy-local': '',
      'post-deploy':
        'npm ci --only=production && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup':
        'sudo mkdir -p /var/www/backend && sudo chown -R $USER:$USER /var/www/backend',
      'post-setup':
        'npm install --production && npm run build && pm2 start ecosystem.config.js --env production',
      ssh_options: 'StrictHostKeyChecking=no',
      env: {
        NODE_ENV: 'production',
      },
    },
    staging: {
      user: 'root',
      host: '43.229.133.51',
      ref: 'origin/develop',
      repo: 'git@github.com:rsdgcxym007/ticket-backend.git',
      path: '/var/www/backend/ticket-backend-staging',
      'pre-deploy-local': '',
      'post-deploy':
        'npm ci && npm run build && pm2 reload ecosystem.config.js --env staging && pm2 save',
      'pre-setup':
        'sudo mkdir -p /var/www/backend && sudo chown -R $USER:$USER /var/www/backend',
      env: {
        NODE_ENV: 'staging',
        PORT: 4001,
      },
    },
  },
};
