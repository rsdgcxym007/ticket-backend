# 🥊 Patong Boxing Stadium - Ticket Backend

Complete backend system for Patong Boxing Stadium ticket booking with NestJS, TypeScript, PostgreSQL, and Redis.

## 🚀 Quick Start - One Command Deployment

```bash
# Upload from local machine and deploy to server
cd scripts && ./upload-and-deploy.sh

# Or if you're already on the server
sudo ./scripts/master-deployment.sh
```

## 🎯 Production URLs

- **Main Site**: https://patongboxingstadiumticket.com
- **API Server**: https://api.patongboxingstadiumticket.com
- **App Portal**: https://app.patongboxingstadiumticket.com  
- **Admin Panel**: https://admin.patongboxingstadiumticket.com

## 📋 Complete Features

- 🎫 **Ticket Booking System** - Complete seat booking with QR codes
- 💳 **Payment Integration** - Stripe payment processing
- 📧 **Email System** - SendGrid + SMTP with templates
- 🔐 **Authentication** - JWT with role-based access
- 📱 **Mobile API** - Optimized for mobile apps
- 👨‍💼 **Admin Dashboard** - Complete management system
- 📊 **Analytics** - Booking and revenue analytics
- 🔄 **Auto-Deployment** - GitHub webhook integration
- 📋 **Monitoring** - Discord alerts + health checks
- 🌐 **Multi-language** - Thai/English support

## 🛠️ Tech Stack

- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + Redis
- **Web Server**: Nginx with SSL
- **Process Manager**: PM2
- **Security**: UFW + Fail2ban
- **Email**: SendGrid + Nodemailer
- **Monitoring**: Custom health checks
- **Deployment**: GitHub Actions + Webhooks

## 📁 Available Scripts

### 🎯 Main Scripts (Recommended)

```bash
# Complete deployment (clean → install → email → monitor)
sudo ./scripts/master-deployment.sh

# Upload from local machine and deploy
./scripts/upload-and-deploy.sh

# Interactive management menu
sudo ./scripts/quick-commands.sh
```

### 🔧 Individual Scripts

```bash
# Clean old installation
sudo ./scripts/complete-project-cleanup.sh

# Install fresh system
sudo ./scripts/complete-deployment-setup.sh  

# Setup email system
sudo ./scripts/setup-email-complete.sh

# Build and deploy updates
./scripts/build-and-deploy.sh
```
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
./scripts/setup-fonts.sh      # Setup fonts for PDF generation
```

### Database
```bash
npm run migration:run     # Run database migrations
npm run seed:zone        # Seed zones
npm run seed:seat        # Seed seats
npm run seed:admin       # Create admin user
```

### Font Setup (Required for PDF Generation)
```bash
./scripts/setup-fonts.sh     # Setup font placeholders
# Then manually add font files to fonts/ directory
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
├── fonts/                 # Font files for PDF generation
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
