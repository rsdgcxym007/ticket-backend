#!/bin/bash

# Complete Build and Deploy Script
# This script will: clean, build, and start with PM2

set -e  # Exit on any error

echo "🎯 Complete Build and Deploy Process"
echo "====================================="

# Change to project directory
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)
echo "📁 Working in: $PROJECT_DIR"

# Step 1: Clean
echo ""
echo "🧹 Step 1: Cleaning previous build..."
npm run clean

# Step 2: Install dependencies
echo ""
echo "📦 Step 2: Installing dependencies..."
npm install --production

# Step 3: Build
echo ""
echo "🛠️ Step 3: Building project..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build successful - dist directory created"

# Step 4: Start with PM2
echo ""
echo "🚀 Step 4: Starting with PM2..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    npm install -g pm2
fi

# Stop and delete existing process
echo "⏹️ Stopping existing process..."
pm2 stop ticket-backend-prod 2>/dev/null || echo "No existing process"
pm2 delete ticket-backend-prod 2>/dev/null || echo "No process to delete"

# Start new process
echo "▶️ Starting application..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Show status
echo ""
echo "📊 Current PM2 Status:"
pm2 status

# Health check
echo ""
echo "🏥 Running health check..."
sleep 5

# Try to check health endpoint
if command -v curl &> /dev/null; then
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health || echo "000")
    if [ "$response" = "200" ]; then
        echo "✅ Health check passed (HTTP $response)"
    else
        echo "⚠️ Health check warning (HTTP $response)"
        echo "📝 Checking logs..."
        pm2 logs ticket-backend-prod --lines 10 --nostream
    fi
else
    echo "ℹ️ curl not available, skipping health check"
fi

echo ""
echo "🎉 Deployment completed!"
echo "🌐 Application: http://localhost:4001"
echo "📚 API Docs: http://localhost:4001/api/docs"
echo "🏥 Health: http://localhost:4001/health"
echo ""
echo "📝 Useful commands:"
echo "  pm2 logs ticket-backend-prod  # View logs"
echo "  pm2 restart ticket-backend-prod  # Restart app"
echo "  pm2 stop ticket-backend-prod  # Stop app"
echo "  pm2 status  # Check status"
