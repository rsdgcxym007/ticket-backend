// PM2 Ecosystem Configuration
// For production deployment on VPS (43.229.133.51)

module.exports = {
  apps: [
    {
      name: 'patong-boxing-stadium',
      script: 'dist/main.js',
      instances: 1, // Single instance for production
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        PROJECT_DIR: '/var/www/api-patongboxingstadiumticket.com',

        // Domain Configuration
        FRONTEND_URL: 'https://patongboxingstadiumticket.com',
        BACKEND_URL: 'https://api-patongboxingstadiumticket.com',
        API_URL: 'https://api-patongboxingstadiumticket.com/api',

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
        JWT_EXPIRATION: '7d',
        JWT_REFRESH_EXPIRATION: '30d',

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

        // Performance
        ENABLE_COMPRESSION: true,
        ENABLE_CACHING: true,
        CACHE_TTL: 300,
      },
      error_file: '/var/log/pm2/ticket-backend-error.log',
      out_file: '/var/log/pm2/ticket-backend-out.log',
      log_file: '/var/log/pm2/ticket-backend.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '512M', // Reduced from 1G to 512M
      node_args: '--max-old-space-size=512 --gc-interval=100', // Optimized memory and GC
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs', '.git'],
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],

  deploy: {
    production: {
      user: 'root',
      host: '43.229.133.51',
      ref: 'origin/feature/newfunction',
      repo: 'git@github.com:rsdgcxym007/ticket-backend.git',
      path: '/var/www/ticket-backend',
      'pre-deploy-local': '',
      'post-deploy':
        'npm ci && npm run clean && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': '',
    },
  },
};
