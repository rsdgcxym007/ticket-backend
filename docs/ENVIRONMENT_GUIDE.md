# Environment Configuration Guide

This guide explains how to manage different environment configurations for your NestJS application.

## Environment Files

### Available Environment Files

- `.env.example` - Template file with all configuration options
- `.env.prod` - Production configuration template for AWS deployment
- `.env` - Current active environment (not committed to git)

### Environment Structure

```
ticket-backend/
├── .env.example        # Template with all options
├── .env.prod          # Production template for AWS
├── .env               # Current active (gitignored)
└── scripts/
    └── env-manager.sh # Environment management script
```

## Quick Start

### 1. Create Your Local Development Environment

```bash
# Copy production template to create local development config
cp .env.prod .env.dev

# Edit for local development
nano .env.dev

# Switch to development environment
./scripts/env-manager.sh switch dev
```

### 2. Configure for Different Environments

```bash
# List available environments
./scripts/env-manager.sh list

# Create new environment
./scripts/env-manager.sh create staging

# Switch between environments
./scripts/env-manager.sh switch prod
./scripts/env-manager.sh switch dev

# Validate environment configuration
./scripts/env-manager.sh validate prod
```

## Environment Variables Explained

### Database Configuration
```bash
DATABASE_HOST=          # Database server hostname
DATABASE_PORT=5432      # Database port (usually 5432 for PostgreSQL)
DATABASE_USERNAME=      # Database username
DATABASE_PASSWORD=      # Database password
DATABASE_NAME=          # Database name
DATABASE_SSL=true       # Enable SSL for production
DATABASE_SYNCHRONIZE=   # Auto-sync schema (false for production)
DATABASE_LOGGING=       # Enable query logging (false for production)
```

### Application Configuration
```bash
NODE_ENV=               # Environment: development, production, test
PORT=4000              # Application port
API_PREFIX=api         # API route prefix
API_VERSION=v1         # API version
```

### Security Configuration
```bash
JWT_SECRET=             # JWT signing secret (min 32 characters)
JWT_EXPIRES_IN=24h     # Token expiration time
RATE_LIMIT_TTL=60      # Rate limiting time window
RATE_LIMIT_LIMIT=100   # Requests per time window
```

### External Services
```bash
# OAuth providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=

# Payment
PROMPTPAY_API_KEY=

# File uploads
MAX_FILE_SIZE=10485760    # 10MB
UPLOAD_PATH=/path/to/uploads
```

## Environment-Specific Configurations

### Development (.env.dev)
```bash
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=true
SWAGGER_ENABLED=true
LOG_LEVEL=debug
```

### Production (.env.prod)
```bash
NODE_ENV=production
DATABASE_HOST=your-rds-endpoint.amazonaws.com
DATABASE_SSL=true
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false
SWAGGER_ENABLED=false
LOG_LEVEL=info
```

### Testing (.env.test)
```bash
NODE_ENV=test
DATABASE_NAME=ticket_backend_test
DATABASE_SYNCHRONIZE=true
LOG_LEVEL=error
```

## AWS Production Setup

### 1. RDS Configuration
Your `.env.prod` should contain:
```bash
DATABASE_HOST=database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-secure-rds-password
DATABASE_NAME=ticket_backend
DATABASE_SSL=true
DATABASE_SYNCHRONIZE=false
```

### 2. Security Configuration
```bash
JWT_SECRET=your-production-jwt-secret-min-32-chars
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FORCE_HTTPS=true
```

### 3. File Upload Configuration
```bash
UPLOAD_PATH=/var/www/ticket-backend/uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

## Deployment Process

### GitHub Actions Deployment
The CI/CD pipeline automatically:
1. Copies `.env.prod` to the deployment package
2. Updates sensitive values from GitHub Secrets
3. Deploys to AWS EC2

### Manual Deployment
```bash
# 1. Switch to production environment locally
./scripts/env-manager.sh switch prod

# 2. Validate configuration
./scripts/env-manager.sh validate prod

# 3. Build and deploy
npm run build
# ... deploy to server
```

## Security Best Practices

### 1. Never Commit Secrets
- `.env` files with actual secrets should never be committed
- Use `.env.example` and `.env.prod` as templates only
- Store production secrets in GitHub Secrets or AWS Parameter Store

### 2. Use Strong Secrets
```bash
# Generate strong JWT secret
openssl rand -base64 64

# Generate random password
openssl rand -base64 32
```

### 3. Environment Isolation
- Use different databases for different environments
- Use different API keys for each environment
- Separate AWS accounts/resources for production

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
```bash
# Validate your environment
./scripts/env-manager.sh validate prod
```

2. **Database Connection Failed**
```bash
# Check database configuration
grep "DATABASE_" .env

# Test database connection
./scripts/setup-database.sh
```

3. **Application Won't Start**
```bash
# Check for syntax errors in .env
cat .env | grep -v "^#" | grep "="

# Validate required variables are set
./scripts/env-manager.sh validate $(grep NODE_ENV .env | cut -d= -f2)
```

### Environment Manager Commands
```bash
# List all available environments
./scripts/env-manager.sh list

# Create new environment from template
./scripts/env-manager.sh create local

# Switch to different environment
./scripts/env-manager.sh switch prod

# Backup current environment
./scripts/env-manager.sh backup

# Validate environment configuration
./scripts/env-manager.sh validate prod
```

## Production Checklist

Before deploying to production:

- [ ] Validate production environment: `./scripts/env-manager.sh validate prod`
- [ ] All secrets are properly set in GitHub Secrets
- [ ] Database credentials are correct
- [ ] JWT_SECRET is strong and unique
- [ ] CORS origins are properly configured
- [ ] File upload paths are correct
- [ ] SSL is enabled
- [ ] Logging is configured appropriately
- [ ] Rate limiting is enabled
