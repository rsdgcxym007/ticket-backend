module.exports = {
  apps: [
    {
      name: 'ticket-backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'cluster',

      // ✅ โหลดจากไฟล์ .env
      env_file: '/var/www/ticket-backend/current/.env',

      // ✅ default environment (development)
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },

      // ✅ override เมื่อใช้ --env production
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        DATABASE_SSL: 'true',
        DATABASE_SYNCHRONIZE: 'false',
        DATABASE_LOGGING: 'false',
        SWAGGER_ENABLED: 'false',
        LOG_LEVEL: 'info',
        ENABLE_CONSOLE_LOG: 'false',
      },

      // Restart configuration
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',

      // Logging
      log_file: '/var/log/pm2/ticket-backend.log',
      error_file: '/var/log/pm2/ticket-backend-error.log',
      out_file: '/var/log/pm2/ticket-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Health monitoring
      health_check_grace_period: 3000,

      // Watch config (for dev)
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
    },
  ],
};
