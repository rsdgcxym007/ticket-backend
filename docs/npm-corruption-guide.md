# NPM Corruption Troubleshooting Guide

## Overview
This guide helps resolve npm corruption issues that can occur during deployment, particularly the "ENOENT" and "ENOTEMPTY" errors seen in TypeORM and other packages.

## Common Symptoms
- `npm warn tar TAR_ENTRY_ERROR ENOENT: no such file or directory`
- `npm error ENOTEMPTY: directory not empty`
- Build failures after successful git pull
- Corrupted `node_modules` directories
- Missing `.d.ts` files in TypeORM or other packages

## Root Causes
1. **Incomplete package extraction**: Network interruptions during npm install
2. **File system corruption**: Disk space issues or permission problems
3. **Concurrent access**: Multiple processes accessing node_modules simultaneously
4. **Cache corruption**: Corrupted npm cache files
5. **Version conflicts**: Package-lock.json inconsistencies

## Quick Fix
Run the automated fix script:
```bash
./scripts/fix-npm-corruption.sh
```

## Manual Resolution Steps

### 1. Stop All Processes
```bash
pm2 stop all
```

### 2. Nuclear Cleanup
```bash
# Remove node_modules completely
chmod -R u+w node_modules 2>/dev/null || true
rm -rf node_modules

# Clean npm cache
npm cache clean --force
npm cache verify

# Remove lock files
rm -f package-lock.json
```

### 3. Clean Install
```bash
# Set environment for development dependencies
export npm_config_production=false
export npm_config_legacy_peer_deps=true

# Install with enhanced options
npm install --include=dev --legacy-peer-deps --no-audit --no-fund
```

### 4. If Still Failing
```bash
# Try with force flag
npm install --include=dev --legacy-peer-deps --no-audit --no-fund --force

# Or use alternative registry
npm config set registry https://registry.npmjs.org/
npm install --include=dev --legacy-peer-deps --no-audit --no-fund --force
```

## Prevention Strategies

### 1. Enhanced Deployment Script
The updated `webhook-deploy.sh` now includes:
- Pre-deployment health checks
- Automatic corruption detection
- Progressive installation strategies
- Enhanced cleanup procedures

### 2. Environment Configuration
Add to your deployment environment:
```bash
export npm_config_legacy_peer_deps=true
export npm_config_audit=false
export npm_config_fund=false
```

### 3. Package.json Configuration
Add to your `package.json`:
```json
{
  "npmConfig": {
    "legacy-peer-deps": true,
    "audit": false,
    "fund": false
  }
}
```

### 4. .npmrc Configuration
Create/update `.npmrc` file:
```
legacy-peer-deps=true
audit=false
fund=false
```

## Deployment Script Enhancements

The updated deployment script now includes:

1. **Pre-deployment Health Checks**
   - Detects corrupted packages before installation
   - Identifies empty or incomplete directories

2. **Enhanced Cleanup**
   - Multiple removal strategies for stubborn files
   - Comprehensive cache cleaning
   - Permission fixes

3. **Progressive Installation**
   - Multiple installation strategies
   - Fallback options for network issues
   - Force installation when needed

4. **Recovery Procedures**
   - Automatic retry with enhanced cleanup
   - Multiple recovery strategies
   - Detailed logging for troubleshooting

## Server-Side Commands

### Check Current State
```bash
# Check npm health
npm ls --depth=0

# Check disk space
df -h

# Check permissions
ls -la node_modules/ | head -20
```

### Emergency Recovery
```bash
# If deployment is stuck
pm2 stop all
pkill -f npm
pkill -f node

# Run the fix script
./scripts/fix-npm-corruption.sh
```

### Monitoring
```bash
# Watch logs during deployment
tail -f ~/.pm2/logs/ticket-backend-prod-error.log
tail -f ~/.pm2/logs/ticket-backend-prod-out.log

# Check PM2 status
pm2 status
pm2 monit
```

## TypeORM Specific Issues

TypeORM corruption is common due to its large number of files. If you see TypeORM-specific errors:

```bash
# Remove only TypeORM
rm -rf node_modules/typeorm
npm install typeorm --legacy-peer-deps

# Or reinstall all TypeORM related packages
npm uninstall typeorm @types/typeorm
npm install typeorm @types/typeorm --legacy-peer-deps
```

## Testing the Fix

After applying the fix:

1. **Verify Installation**
   ```bash
   npm ls --depth=0
   ```

2. **Test Build**
   ```bash
   npm run build
   ```

3. **Check Critical Packages**
   ```bash
   ls -la node_modules/@nestjs/core
   ls -la node_modules/typeorm
   ls -la node_modules/@swc/helpers
   ```

4. **Test Application Start**
   ```bash
   npm run start:prod
   ```

## Contact & Support

If the automated fixes don't resolve the issue:
1. Check the deployment logs for specific error patterns
2. Verify disk space and permissions on the server
3. Consider running the deployment with verbose npm logging:
   ```bash
   npm install --include=dev --legacy-peer-deps --verbose
   ```

The enhanced deployment script should handle most corruption scenarios automatically, but manual intervention may be needed for severe corruption cases.
