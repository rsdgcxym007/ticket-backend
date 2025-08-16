# 🚀 Auto-Deployment System

## Overview
Automated deployment system for Patong Boxing Stadium ticket backend with real-time Discord notifications.

## Features
- ✅ Automatic deployment on Git push
- 📱 Discord notifications for deployment status
- 🔍 Health checks after deployment
- 📊 System monitoring integration
- 🛡️ Memory optimization and cleanup

## Setup Complete ✅

### Current Configuration:
- **Webhook URL**: `http://43.229.133.51:4200/hooks/deploy-backend-master`
- **Discord Channel**: Configured with webhook notifications
- **Branch**: `feature/newfunction`
- **Auto-deploy**: ✅ Active

## Usage

### Manual Deployment Trigger:
```bash
curl -X POST http://43.229.133.51:4200/hooks/deploy-backend-master
```

### Automatic Deployment:
Simply push to the `feature/newfunction` branch:
```bash
git add .
git commit -m "Your changes"
git push origin feature/newfunction
```

## Discord Notifications

The system sends notifications for:
- 🚀 **Deployment Started** - When webhook is triggered
- ✅ **Deployment Completed** - With system health status
- 🔴 **Deployment Failed** - If any errors occur
- 📊 **System Health** - Memory usage, active processes, API status

## Monitoring Scripts

### Available Scripts:
1. **`./scripts/memory-monitor.sh`** - Memory monitoring and cleanup
2. **`./scripts/maintenance.sh`** - System maintenance routines
3. **`./scripts/status.sh`** - Real-time server status dashboard
4. **`./scripts/setup-auto-deploy.sh`** - Auto-deployment configuration

### Usage Examples:
```bash
# Check memory status
./scripts/memory-monitor.sh check

# Daily maintenance
./scripts/maintenance.sh daily

# View server status
./scripts/status.sh

# Setup auto-deployment (already done)
./scripts/setup-auto-deploy.sh
```

## Troubleshooting

### If webhook doesn't work:
1. Check PM2 status: `ssh root@43.229.133.51 "pm2 list"`
2. Restart webhook service: `ssh root@43.229.133.51 "pm2 restart webhook-deploy-service"`
3. Check logs: `ssh root@43.229.133.51 "pm2 logs webhook-deploy-service"`

### If Discord notifications fail:
1. Check webhook URL is valid
2. Verify network connectivity
3. Check deployment logs: `ssh root@43.229.133.51 "tail -f /var/log/auto-deploy-*.log"`

## System Health

Current system status:
- **Memory Usage**: Optimized (< 800MB)
- **Active Processes**: 3 (2x API + 1x Webhook)
- **API Status**: ✅ Online (Port 4000)
- **Webhook Service**: ✅ Online (Port 4200)

## Security Features

- UFW firewall configured
- Fail2ban protection active
- SSH security hardened
- Memory limits enforced
- Automatic process restart on failure

---

**Last Updated**: August 16, 2025
**Status**: ✅ Fully Operational
