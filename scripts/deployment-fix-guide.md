# Deployment Error Fix - MODULE_NOT_FOUND

## Issue Analysis
The error `Cannot find module '/var/www/backend/ticket-backend/dist/main.js'` indicates that the built main.js file is missing on the production server.

## Root Causes
1. Build process not running during deployment
2. dist folder not being transferred to production
3. Build failing silently
4. PM2 starting before build completion

## Immediate Fix Steps

### 1. Emergency Fix (Quick Solution)
```bash
# Run the emergency fix script
npm run emergency-fix

# Or manually:
rm -rf dist/
npm run build
pm2 restart ticket-backend-prod
```

### 2. Full Deployment Fix
```bash
# Use the comprehensive build and deploy script
npm run build-deploy

# Or run the script directly:
./scripts/build-and-deploy.sh
```

### 3. Manual Verification Steps
```bash
# 1. Check if dist/main.js exists
ls -la dist/main.js

# 2. Verify the file size and content
stat dist/main.js
head -10 dist/main.js

# 3. Test the build locally
node dist/main.js --version

# 4. Check PM2 status
pm2 status

# 5. Check PM2 logs for errors
pm2 logs ticket-backend-prod
```

## Long-term Prevention

### 1. Updated Build Process
- Clean dist folder before build (`prebuild` script)
- Verify build output exists
- Test built application before deployment

### 2. Enhanced PM2 Configuration
- Add proper error handling
- Increase restart delay
- Better logging configuration

### 3. Deployment Scripts
- `build-and-deploy.sh`: Complete deployment process
- `emergency-fix.sh`: Quick fix for MODULE_NOT_FOUND errors

## Environment Verification
Make sure these files exist and are properly configured:
- ✅ `package.json` - build scripts
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `tsconfig.build.json` - Build-specific config
- ✅ `nest-cli.json` - NestJS CLI configuration
- ✅ `ecosystem.config.js` - PM2 configuration

## Build Output Verification
After running build, verify these files exist:
- `dist/main.js` - Main application entry point
- `dist/main.d.ts` - Type definitions
- `dist/app.module.js` - App module
- `dist/**/*.js` - All compiled modules

## PM2 Configuration Notes
The ecosystem.config.js is set to:
- Script: `dist/main.js`
- Working directory: Project root
- Environment: Production
- Single instance (fork mode)

## Common Issues and Solutions

### Issue: "Cannot find module"
**Solution**: Ensure build runs before PM2 start
```bash
npm run build && pm2 start ecosystem.config.js
```

### Issue: Build appears to succeed but no dist/main.js
**Solution**: Check TypeScript compilation errors
```bash
npx tsc --noEmit
```

### Issue: PM2 starts but immediately crashes
**Solution**: Check application logs and dependencies
```bash
pm2 logs ticket-backend-prod
npm ci
```
