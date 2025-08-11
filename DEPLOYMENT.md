# 🚀 Quick Deployment Guide

## 📋 Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional)
- PM2 (will be installed automatically)

## ⚡ Quick Start

### 1. Complete Build and Deploy
```bash
./scripts/build-and-start.sh
```
This will:
- Clean previous build
- Install dependencies
- Build the project
- Start with PM2
- Run health check

### 2. Quick PM2 Start (if already built)
```bash
./scripts/start-pm2.sh
```

### 3. Manual Steps
```bash
# Install dependencies
npm install

# Build project
npm run build

# Start with PM2
npm run start:pm2
```

## 🔧 PM2 Management

### Start/Stop/Restart
```bash
pm2 start ticket-backend-prod
pm2 stop ticket-backend-prod
pm2 restart ticket-backend-prod
pm2 delete ticket-backend-prod
```

### View Logs
```bash
pm2 logs ticket-backend-prod
pm2 logs ticket-backend-prod --lines 50
pm2 flush  # Clear logs
```

### Monitor
```bash
pm2 status
pm2 monit
pm2 show ticket-backend-prod
```

## 🌐 Application URLs

- **Main Application:** http://localhost:4001
- **API Documentation:** http://localhost:4001/api/docs
- **Health Check:** http://localhost:4001/health

## 📊 Environment Configuration

### Development
```bash
cp .env.development .env
npm run start:dev
```

### Production
```bash
cp .env.production .env
./scripts/build-and-start.sh
```

## 🗄️ Database Setup

### Local PostgreSQL
```sql
CREATE USER boxing_user WITH PASSWORD 'Password123!';
CREATE DATABASE boxing_ticket_db OWNER boxing_user;
GRANT ALL PRIVILEGES ON DATABASE boxing_ticket_db TO boxing_user;
```

### Migration
```bash
npm run migration:run
```

## 🚨 Troubleshooting

### Port Already in Use
```bash
lsof -ti:4001 | xargs kill -9
pm2 restart ticket-backend-prod
```

### Build Errors
```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### PM2 Issues
```bash
pm2 kill
npm install -g pm2
pm2 start ecosystem.config.js --env production
```

### Health Check Failed
```bash
pm2 logs ticket-backend-prod
curl http://localhost:4001/health
```

## 📁 Project Structure (Cleaned)

```
ticket-backend/
├── src/                    # Source code
│   ├── analytics/         # Analytics & ML features
│   ├── auth/             # Authentication
│   ├── scalability/      # Scalability infrastructure
│   ├── user/             # User management
│   ├── order/            # Order management
│   ├── payment/          # Payment processing
│   ├── seats/            # Seat management
│   └── ...
├── scripts/              # Deployment scripts
├── .env.production       # Production config
├── .env.development      # Development config
├── ecosystem.config.js   # PM2 configuration
└── package.json          # Dependencies
```

## 🎯 Available Features

### ✅ Completed (Phase 5.3)
- Complete ticket booking system
- Advanced analytics with ML
- Scalability infrastructure
- Microservices architecture
- Redis clustering
- Database sharding
- Load balancing
- Container orchestration

### 🔧 Available Scripts
```bash
npm run start:dev      # Development mode
npm run build         # Build project
npm run start:pm2     # Start with PM2
npm run logs:pm2      # View PM2 logs
npm run status:pm2    # Check PM2 status
npm run deploy:dev    # Quick deploy
npm run health:check  # System health check
```
