# 🎫 Ticket Backend System v5.3.0

Enterprise-grade ticket booking system with advanced analytics and scalability infrastructure.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional)
- PM2 (auto-installed)

### Start Development
```bash
npm install
npm run start:dev
```

### Deploy Production
```bash
# Complete build and deploy
./scripts/build-and-start.sh

# Or step by step
npm run build
npm run start:pm2
```

## 📊 System Features

### ✅ Core Features (Completed)
- **Authentication & Authorization** - JWT, Role-based access
- **Order Management** - Seated/Standing tickets
- **Payment Processing** - Multiple payment methods
- **Seat Management** - Real-time locking/unlocking
- **User Management** - Customer/Staff/Admin roles
- **Admin Dashboard** - Complete management interface

### ✅ Phase 5.2 - Advanced Analytics Engine
- ML-powered sales prediction (Linear Regression)
- Demand forecasting (Exponential Smoothing)
- Price elasticity analysis
- Statistical business intelligence

### ✅ Phase 5.3 - Scalability Infrastructure
- Microservices architecture (5 core services)
- Redis clustering and advanced caching
- Database sharding and optimization
- Load balancing with health-based routing
- Container orchestration (Kubernetes ready)
- Infrastructure monitoring (Prometheus/Grafana)

## 🎮 Available Commands

### Development
```bash
npm run start:dev      # Development mode with hot reload
npm run build         # Build project
npm run lint          # Fix linting errors
```

### PM2 Production
```bash
npm run start:pm2     # Start with PM2
npm run stop:pm2      # Stop PM2 process
npm run restart:pm2   # Restart PM2 process
npm run logs:pm2      # View PM2 logs
npm run status:pm2    # Check PM2 status
```

### Deployment Scripts
```bash
./scripts/build-and-start.sh  # Complete build & deploy
./scripts/start-pm2.sh        # Start PM2 only
./scripts/deploy.sh           # VPS deployment
./scripts/quick-deploy.sh     # Quick deployment
./scripts/status-check.sh     # System health check
./scripts/rollback.sh         # Emergency rollback
```

### Database
```bash
npm run migration:run     # Run database migrations
npm run seed:zone        # Seed zones
npm run seed:seat        # Seed seats
npm run seed:admin       # Create admin user
```

## 🌐 Application URLs

- **Main Application:** http://localhost:4001
- **API Documentation:** http://localhost:4001/api/docs
- **Health Check:** http://localhost:4001/health

### API Endpoints
- **Analytics:** `/api/v1/analytics` - Business analytics & ML
- **Scalability:** `/api/v1/scalability` - Infrastructure management
- **Orders:** `/api/v1/orders` - Order management
- **Users:** `/api/v1/users` - User management
- **Authentication:** `/api/v1/auth` - Login/logout

## 🏗️ Project Structure

```
ticket-backend/
├── src/                     # Source code
│   ├── analytics/          # Phase 5.2 - ML Analytics
│   ├── scalability/        # Phase 5.3 - Infrastructure
│   ├── auth/              # Authentication system
│   ├── user/              # User management
│   ├── order/             # Order system
│   ├── payment/           # Payment processing
│   ├── seats/             # Seat management
│   └── app.module.ts      # Main application module
├── scripts/               # Deployment scripts
├── k8s/                  # Kubernetes configurations
├── docs/                 # Documentation
├── .env.production       # Production environment
├── .env.development      # Development environment
├── ecosystem.config.js   # PM2 configuration
└── package.json          # Dependencies & scripts
```

## 🔧 Environment Configuration

### Development (.env.development)
```env
NODE_ENV=development
PORT=4000
DATABASE_HOST=localhost
DATABASE_NAME=ticket_backend_test
```

### Production (.env.production)
```env
NODE_ENV=production
PORT=4001
DATABASE_HOST=43.229.133.51
DATABASE_NAME=boxing_ticket_db
```

## 🗄️ Database Setup

### PostgreSQL Configuration
```sql
-- Production Database
CREATE USER boxing_user WITH PASSWORD 'Password123!';
CREATE DATABASE boxing_ticket_db OWNER boxing_user;
GRANT ALL PRIVILEGES ON DATABASE boxing_ticket_db TO boxing_user;

-- Test Database
CREATE DATABASE ticket_backend_test OWNER boxing_user;
```

## 📈 Performance & Monitoring

### System Metrics
- **Server:** VPS 43.229.133.51 (Ubuntu 24.04)
- **Memory:** 4GB RAM
- **CPU:** 2 Cores
- **Database:** PostgreSQL with sharding
- **Cache:** Redis clustering

### Health Monitoring
```bash
# Check system health
./scripts/status-check.sh

# View application logs
pm2 logs ticket-backend-prod

# Monitor resources
pm2 monit
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
lsof -ti:4001 | xargs kill -9
pm2 restart ticket-backend-prod
```

#### Build Errors
```bash
npm run clean
rm -rf node_modules
npm install
npm run build
```

#### Database Connection
```bash
# Check PostgreSQL
systemctl status postgresql

# Test connection
psql -h 43.229.133.51 -U boxing_user -d boxing_ticket_db
```

#### PM2 Issues
```bash
pm2 kill
npm install -g pm2
pm2 start ecosystem.config.js --env production
```

## 🔒 Security Features

- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- API rate limiting
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

## 📊 Technical Stack

- **Framework:** NestJS + TypeScript
- **Database:** PostgreSQL + TypeORM
- **Cache:** Redis
- **Authentication:** JWT + Passport
- **Documentation:** Swagger/OpenAPI
- **Process Manager:** PM2
- **Containerization:** Docker + Kubernetes
- **Monitoring:** Prometheus + Grafana

## 🎯 Next Phase (5.4)

Enterprise Security Suite:
- SAML/OAuth 2.0 integration
- Advanced RBAC implementation
- Security compliance features
- Multi-factor authentication
- Threat detection & prevention

## 📞 Support

**VPS Server:** 43.229.133.51
**Application:** http://43.229.133.51:4001
**Repository:** https://github.com/rsdgcxym007/ticket-backend

For issues or questions, check the logs:
```bash
pm2 logs ticket-backend-prod
```
