# Deployment with Discord Notifications

## Overview
The deployment scripts now include Discord webhook integration to notify your team about deployment status in real-time.

## Discord Webhook Setup
- **Webhook URL**: `https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l`
- **Channel**: Will post to the configured Discord channel
- **Notifications**: Automatic notifications for deployment status

## Available Scripts

### 1. Build and Deploy (Full Deployment)
```bash
npm run build-deploy
# or
./scripts/build-and-deploy.sh
```

**Discord Notifications:**
- 🚀 Deployment started
- ✅ Deployment successful 
- ❌ Deployment failed (with error details)

### 2. Emergency Fix (Quick Fix)
```bash
npm run emergency-fix
# or
./scripts/emergency-fix.sh
```

**Discord Notifications:**
- 🚨 Emergency fix started
- ✅ Emergency fix completed
- ❌ Emergency fix failed

### 3. Test Discord Notifications
```bash
npm run test-discord
# or
./scripts/test-discord-notifications.sh
```

**Test Notifications:**
- 🧪 Test notification
- ✅ Success test
- ⚠️ Warning test
- ❌ Error test

## Notification Details

Each Discord notification includes:
- **Status**: Current deployment phase
- **Branch**: Git branch being deployed
- **Timestamp**: When the event occurred
- **Server**: Hostname of the deployment server

## Color Coding
- 🟢 **Green (5763719)**: Success messages
- 🔴 **Red (15158332)**: Error messages  
- 🟡 **Yellow (16776960)**: Warning/In-progress messages
- 🔵 **Blue (3447003)**: Test/Info messages

## Fixing MODULE_NOT_FOUND Error

### Quick Fix
```bash
npm run emergency-fix
```

This will:
1. Send Discord notification about emergency fix start
2. Clean and rebuild the application
3. Restart PM2 process
4. Send success/failure notification

### Full Deployment
```bash
npm run build-deploy
```

This will:
1. Send deployment start notification
2. Install dependencies
3. Clean previous build
4. Build application
5. Verify build success
6. Stop existing PM2 process
7. Start new PM2 process
8. Send completion notification

## Manual Discord Notification Testing

To test if Discord notifications are working:
```bash
curl -H "Content-Type: application/json" \
     -X POST \
     -d '{"content": "🧪 Manual test from ticket-backend deployment system"}' \
     "https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
```

## Troubleshooting

### Discord Notifications Not Working
1. Check internet connectivity
2. Verify webhook URL is correct
3. Ensure curl is installed
4. Check Discord server permissions

### Deployment Still Failing
1. Check PM2 logs: `pm2 logs ticket-backend-prod`
2. Verify Node.js version compatibility
3. Check database connection
4. Verify environment variables

## Environment Requirements
- Node.js (compatible version)
- npm
- PM2
- curl (for Discord notifications)
- Git (for branch detection)
