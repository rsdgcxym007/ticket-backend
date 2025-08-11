// PM2 Ecosystem Configuration
// For production deployment on VPS (43.229.133.51)

module.exports = {
  apps: [
    {
      name: 'ticket-backend-prod',
      script: 'dist/main.js',
      instances: 1, // Single instance to avoid port conflicts
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
        // Database Configuration
        DATABASE_HOST: '43.229.133.51',
        DATABASE_PORT: 5432,
        DATABASE_USERNAME: 'boxing_user',
        DATABASE_PASSWORD: 'Password123!',
        DATABASE_NAME: 'boxing_ticket_db',
        DATABASE_SSL: false,
        DATABASE_SYNCHRONIZE: false,
        DATABASE_LOGGING: false,
        // Redis Configuration
        REDIS_HOST: '43.229.133.51',
        REDIS_PORT: 6379,
        // JWT Configuration
        JWT_SECRET: 'prod-jwt-secret-key-change-this',
        JWT_EXPIRATION: '24h',
        // Application Settings
        BCRYPT_ROUNDS: 12,
        RATE_LIMIT_TTL: 60000,
        RATE_LIMIT_LIMIT: 100,
      },
      error_file: '/var/log/pm2/ticket-backend-error.log',
      out_file: '/var/log/pm2/ticket-backend-out.log',
      log_file: '/var/log/pm2/ticket-backend.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
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
        'npm install --production && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': '',
    },
  },
};
