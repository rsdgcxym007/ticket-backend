# 🚨 Deployment Troubleshooting Guide

## Current Issue: Backend Deployment Failed

### Root Cause Analysis
The deployment failure is primarily due to **Node.js version incompatibility**:

1. **Server Environment**: Running Node.js v18.20.5  
2. **Project Requirements**: Now requires Node.js v20.0.0+
3. **Dependency Conflicts**: Modern NestJS and Firebase packages require Node.js v20+

### Error Symptoms
- ✋ `EBADENGINE` warnings during `npm install`
- 🔥 Build process hanging or failing
- ⚠️ Warnings about deprecated packages (fstream, rimraf, glob)
- 💥 PM2 restart failures

---

## 🔧 Immediate Solutions

### Option 1: Server Node.js Upgrade (Recommended)
```bash
# Check current version
node --version

# Using nvm (if available)
nvm install 20.18.0
nvm use 20.18.0
nvm alias default 20.18.0

# Or using Node Version Manager
curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s lts
```

### Option 2: Compatibility Mode (Temporary Fix)
Update the deployment script to use compatibility flags:

```bash
export NODE_OPTIONS="--max-old-space-size=2048"
export NPM_CONFIG_ENGINE_STRICT=false
export NPM_CONFIG_LEGACY_PEER_DEPS=true

npm install --legacy-peer-deps --force --engine-strict=false
npm run build --legacy-peer-deps
```

### Option 3: Downgrade Dependencies (Not Recommended)
Downgrade to compatible versions, but this may break features:
```bash
npm install @nestjs/core@^10.0.0 @nestjs/cli@^10.0.0
```

---

## 🚀 Quick Fix Steps

### 1. Immediate Server Fix
```bash
# SSH to your server
ssh your-server

# Navigate to project
cd /var/www/backend/ticket-backend

# Run compatibility check
bash scripts/check-node-compatibility.sh

# If Node.js upgrade is needed:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Redeploy with Fixed Script
```bash
# The auto-deploy.sh has been updated with:
# - Node.js version checking
# - Enhanced error handling  
# - Compatibility flags
# - Better dependency management

bash monitoring/auto-deploy.sh deploy
```

### 3. Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check application health
curl https://api.patongboxingstadiumticket.com/health

# Check logs
pm2 logs ticket-backend-prod
```

---

## 📋 Prevention Measures

### 1. Updated package.json
- ✅ Node.js engine requirement updated to `>=20.0.0`
- ✅ Added compatibility overrides
- 🔄 Regular dependency updates

### 2. Enhanced Deployment Script
- ✅ Pre-deployment Node.js version check
- ✅ Better error handling and reporting
- ✅ Discord notifications with detailed error info
- ✅ Fallback build methods

### 3. Monitoring Improvements
- 🔍 Node.js compatibility checker script
- 📊 Better deployment logging
- 🚨 Proactive dependency conflict detection

---

## 🆘 Emergency Procedures

### If Deployment Still Fails:

1. **Manual Deployment**:
   ```bash
   cd /var/www/backend/ticket-backend
   git pull origin feature/newfunction
   NODE_OPTIONS="--max-old-space-size=2048" npm install --legacy-peer-deps
   NODE_OPTIONS="--max-old-space-size=2048" npm run build
   pm2 restart ticket-backend-prod
   ```

2. **Rollback to Previous Version**:
   ```bash
   git checkout HEAD~1
   npm install --legacy-peer-deps
   npm run build
   pm2 restart ticket-backend-prod
   ```

3. **Docker Deployment** (if available):
   ```bash
   docker build -t ticket-backend .
   docker run -d --name ticket-backend-container ticket-backend
   ```

---

## 🔮 Long-term Recommendations

1. **Infrastructure Upgrade**:
   - Upgrade server to Node.js LTS (v20.18.0+)
   - Consider containerization (Docker)
   - Implement CI/CD pipeline with proper testing

2. **Dependency Management**:
   - Regular dependency audits
   - Use `npm audit` and `npm outdated`
   - Implement dependency update automation

3. **Deployment Process**:
   - Blue-green deployment strategy
   - Automated rollback procedures
   - Health checks and monitoring

---

## 📞 Contact Information

For immediate assistance:
- 🚨 **Critical Issues**: Check PM2 logs and Discord notifications
- 📧 **Non-urgent**: Create GitHub issue with logs
- 🔧 **Server Access**: Use provided SSH credentials

---

*Last Updated: August 16, 2025*  
*Version: 1.0*
