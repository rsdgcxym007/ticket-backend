# Scripts Directory 🚀

Essential deployment and management scripts for the Ticket Backend system.

## Available Scripts

### 1. `deploy.sh` - Universal Deployment Script
Comprehensive deployment solution supporting multiple environments and modes.

**Usage:**
```bash
# Quick deployment (git pull + restart)
./deploy.sh quick

# Full deployment with backup
./deploy.sh full

# Local development build and start
./deploy.sh local

# VPS server initial setup (requires sudo)
sudo ./deploy.sh vps

# With options
./deploy.sh full --no-backup --branch=main
```

**Features:**
- Multiple deployment modes (quick/full/local/vps)
- Automatic backup creation
- Discord notifications
- Health checks
- Git branch support
- PM2 management

### 2. `webhook-deploy.sh` - 🔄 Auto-Deployment Script
**Main auto-deployment script** with comprehensive error handling.

**Usage:**
```bash
./webhook-deploy.sh
```

**Features:**
- ✅ Enhanced error handling and recovery
- ✅ Multiple fallback strategies for npm/build failures  
- ✅ Timeout protection for all operations
- ✅ Discord notifications (optional)
- ✅ Smart PM2 restart handling

### 3. `safe-restart.sh` - 🛡️ Safe PM2 Restart
Advanced PM2 restart with multiple fallback strategies.

**Usage:**
```bash
./safe-restart.sh [app_name] [project_dir]
```

**Features:**
- ✅ 4-tier fallback strategy for PM2 operations
- ✅ Timeout protection to prevent hanging
- ✅ Force cleanup for unresponsive PM2 processes
- ✅ Application health verification

### 4. `quick-deploy.sh` - ⚡ Manual Deployment with Debug
Manual deployment with verbose debugging output.

**Usage:**
```bash
./quick-deploy.sh
```

**Features:**
- ✅ Verbose logging for troubleshooting
- ✅ Before/after status comparison
- ✅ Deploy log saving
- ✅ Interrupt handling

### 5. `manage.sh` - Application Management
Complete PM2 and application lifecycle management.

**Usage:**
```bash
# Start/stop/restart application
./manage.sh start
./manage.sh stop
./manage.sh restart

# Monitor application
./manage.sh status
./manage.sh logs
./manage.sh monitor

# Backup management
./manage.sh rollback
./manage.sh list-backups
```

**Features:**
- PM2 process management
- Health monitoring
- Log viewing
- Backup rollback system
- System resource monitoring

### 3. `build-and-start.sh` - Local Development
Complete build and start process for local development.

**Usage:**
```bash
./build-and-start.sh
```

**Features:**
- Clean build process
- Dependency installation
- PM2 local startup
- Health verification

### 4. `setup-fonts.sh` - Font Management
Download and install required fonts for PDF generation.

**Usage:**
```bash
./setup-fonts.sh
```

**Features:**
- Roboto font family download
- Thai font (THSarabunNew) installation
- Font verification
- PDF generation support

## Quick Start

1. **Development Setup:**
   ```bash
   ./setup-fonts.sh
   ./deploy.sh local
   ```

2. **Production Deployment:**
   ```bash
   ./deploy.sh full
   ./manage.sh status
   ```

3. **Emergency Rollback:**
   ```bash
   ./manage.sh rollback
   ```

## Configuration

Scripts use these default configurations:
- **Project Directory:** `/var/www/ticket-backend`
- **PM2 App Name:** `ticket-backend-prod`
- **Default Branch:** `feature/newfunction`
- **Port:** `4000`

## Requirements

- Node.js 18+
- PM2 (auto-installed if missing)
- Git
- curl (for health checks and notifications)

## Notes

- All scripts include error handling and logging
- Discord notifications are sent for deployment events
- Backups are automatically created before major deployments
- Health checks verify application status after deployment
- Minor feature updates
- No database schema changes
- Low-risk deployments

---

### 3. `rollback.sh` - Emergency Rollback
**Purpose:** Quickly rollback to the previous stable deployment.

**Features:**
- 🔄 Automatic rollback to latest backup
- 🏥 Health check after rollback
- 📢 Success/failure notifications

**Usage:**
```bash
sudo ./scripts/rollback.sh
```

**Use when:**
- Deployment failed
- Critical bugs found
- Emergency restoration needed

---

### 4. `status-check.sh` - System Health Monitor
**Purpose:** Comprehensive system and application health monitoring.

**Features:**
- 📊 System resource monitoring
- 🔧 Service status checking
- 🏥 Application health validation
- 🗄️ Database connectivity test
- ⚡ Redis connectivity test
- 📝 Error log analysis

**Usage:**
```bash
./scripts/status-check.sh
```

**Monitors:**
- Memory and disk usage
- CPU load
- PostgreSQL status
- Redis status
- Nginx status
- PM2 processes
- Application endpoints
- Recent error logs

---

### 5. `deploy-vps.sh` - Initial VPS Setup
**Purpose:** One-time VPS server setup and configuration.

**Features:**
- 🖥️ System packages installation
- 🗄️ Database setup
- ⚡ Redis configuration
- 🌐 Nginx reverse proxy
- 🔒 Firewall configuration
- 📦 PM2 installation

**Usage:**
```bash
sudo ./scripts/deploy-vps.sh
```

**Use only once:** During initial server setup.

---

## 🔧 Configuration

### Discord Webhook
All scripts use Discord webhook for notifications:
```bash
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1401766190879215697/..."
```

### Server Configuration
- **Server IP:** 43.229.133.51
- **Application Port:** 4001
- **Database:** PostgreSQL (port 5432)
- **Redis:** Port 6379
- **Project Path:** `/var/www/ticket-backend`
- **PM2 App Name:** `ticket-backend-prod`
- **Branch:** `feature/newfunction`

### Backup Location
- **Backup Directory:** `/var/backups/ticket-backend`
- **Database Backups:** `db-backup-YYYYMMDD-HHMMSS.sql`
- **Code Backups:** `backup-YYYYMMDD-HHMMSS/`

---

## 📊 Deployment Workflow

### Production Deployment Process
```bash
# 1. Check system status
./scripts/status-check.sh

# 2. Full deployment
sudo ./scripts/deploy.sh

# 3. Verify deployment
curl http://43.229.133.51:4001/health

# 4. Monitor logs
pm2 logs ticket-backend-prod
```

### Emergency Procedures
```bash
# If deployment fails
sudo ./scripts/rollback.sh

# Check what went wrong
./scripts/status-check.sh
pm2 logs ticket-backend-prod --lines 50
```

---

## 🚨 Troubleshooting

### Common Issues

#### Script Permission Denied
```bash
chmod +x scripts/*.sh
```

#### PM2 Process Not Found
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

#### Database Connection Failed
```bash
systemctl status postgresql
sudo systemctl restart postgresql
```

#### Application Not Responding
```bash
pm2 restart ticket-backend-prod
pm2 logs ticket-backend-prod
```

#### Out of Disk Space
```bash
# Clean old backups
find /var/backups/ticket-backend -name "backup-*" -mtime +7 -delete

# Clean PM2 logs
pm2 flush

# Clean npm cache
npm cache clean --force
```

---

## 📈 Monitoring Integration

### Automatic Health Checks
Scripts can be scheduled with cron for regular monitoring:

```bash
# Add to crontab (crontab -e)
# Check status every 5 minutes
*/5 * * * * /var/www/ticket-backend/scripts/status-check.sh

# Daily backup at 2 AM
0 2 * * * /var/www/ticket-backend/scripts/deploy.sh --backup-only
```

### Log Locations
- **Application Logs:** `/var/log/pm2/ticket-backend-*.log`
- **Nginx Logs:** `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **System Logs:** `/var/log/syslog`

---

## 🔒 Security Notes

- All scripts require appropriate permissions
- Database credentials are stored in environment files
- Discord webhook URL should be kept secure
- Backup files contain sensitive data
- Always test scripts in development first

---

## 📞 Support

**Server Access:**
```bash
ssh root@43.229.133.51
```

**Application URLs:**
- Main App: http://43.229.133.51:4001
- API Docs: http://43.229.133.51:4001/api/docs
- Health Check: http://43.229.133.51:4001/health

**Key Commands:**
```bash
# View PM2 status
pm2 status

# View logs
pm2 logs ticket-backend-prod

# Restart application
pm2 restart ticket-backend-prod

# System resources
htop
df -h
free -h
```
