module.exports = {
  apps: [
    {
      name: 'ticket-backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
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

      // Auto restart on file changes (development only)
      watch: false,
      ignore_watch: ['node_modules', 'logs'],

      // Environment variables
      env_file: '.env',

      // Production environment variables (will override env_file values)
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
    },
  ],
};
