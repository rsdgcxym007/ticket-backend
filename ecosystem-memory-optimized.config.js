// PM2 Ecosystem Configuration - Memory Optimized
// Ultra-strict memory management for 4GB VPS

module.exports = {
  apps: [
    {
      name: 'ticket-backend-prod',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/var/www/backend/ticket-backend',

      // 🔥 ULTRA STRICT MEMORY LIMITS
      node_args: [
        '--max-old-space-size=256', // Very strict heap limit
        '--max-new-space-size=64', // Limit new generation
        '--initial-old-space-size=64', // Start with small heap
        '--optimize-for-size', // Optimize for memory, not speed
        '--gc-interval=100', // More frequent GC
        '--always-compact', // Always compact memory
      ].join(' '),

      max_memory_restart: '300M', // Restart if exceeds 300MB
      min_uptime: '10s',
      max_restarts: 3,

      // 📊 Enhanced Monitoring
      monitoring: true,
      pmx: true,

      // 🔄 Auto restart settings
      watch: false,
      autorestart: true,

      // 🕒 Aggressive memory cleanup
      cron_restart: '*/30 * * * *', // Restart every 30 minutes

      // 📝 Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/backend-error.log',
      out_file: '/var/log/pm2/backend-out.log',
      log_file: '/var/log/pm2/backend-combined.log',

      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,

        // Memory optimization environment
        UV_THREADPOOL_SIZE: 4, // Limit thread pool
        NODE_NO_WARNINGS: 1, // Reduce console output

        // Application config
        PROJECT_DIR: '/var/www/backend/ticket-backend',

        // Database
        DATABASE_HOST: '43.229.133.51',
        DATABASE_PORT: 5432,
        DATABASE_USERNAME: 'boxing_user',
        DATABASE_PASSWORD: 'Password123!',
        DATABASE_NAME: 'patong_boxing_stadium',

        // Email (Gmail SMTP)
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 587,
        SMTP_USER: 'patongboxingstadiumticket@gmail.com',
        SMTP_PASS: 'wykeiiiswwdznmko',
        EMAIL_FROM: 'patongboxingstadiumticket@gmail.com',

        // Security
        JWT_SECRET:
          'dfs5YwjhIy7vauZGF2giB2hjMX8FghxbwZon+yGUAkb+DlQJKNqxrGKIDuLoY4MYD0I+tkQ0PQ7XmK9mEYwrLw==',

        // Redis
        REDIS_HOST: '43.229.133.51',
        REDIS_PORT: 6379,

        // Performance
        ENABLE_COMPRESSION: true,
        ENABLE_CACHING: false, // Disable caching to save memory

        // Domain
        FRONTEND_URL: 'https://patongboxingstadiumticket.com',
        BACKEND_URL: 'https://api.patongboxingstadiumticket.com',
      },
    },
    {
      name: 'webhook-server',
      script: 'monitoring/webhook-server.js',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/var/www/backend/ticket-backend',

      // Webhook server memory limits
      node_args: '--max-old-space-size=128',
      max_memory_restart: '150M',

      env: {
        WEBHOOK_PORT: 4200,
        WEBHOOK_SECRET: 'webhook-secret-key-2025',
      },
    },
  ],
};
