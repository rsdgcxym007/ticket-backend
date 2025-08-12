#!/bin/bash

# Debug Script to Check Paths and Setup
# This script helps identify and fix path issues

echo "🔍 Debugging Auto-Deployment Setup"
echo "=================================="

# Check current working directory when NestJS runs
echo "📁 Current Working Directory (when app runs):"
echo "   $(pwd)"

# Check possible project paths
echo ""
echo "📍 Checking possible project paths:"
paths=(
    "/var/www/backend/ticket-backend"
    "/var/www/ticket-backend"
    "/opt/ticket-backend"
    "/home/ubuntu/ticket-backend"
    "$(pwd)"
)

for path in "${paths[@]}"; do
    if [ -d "$path" ]; then
        echo "   ✅ $path (EXISTS)"
        if [ -f "$path/package.json" ]; then
            echo "      📦 package.json found"
        fi
        if [ -f "$path/scripts/webhook-deploy.sh" ]; then
            echo "      📄 webhook-deploy.sh found"
        fi
        if [ -d "$path/.git" ]; then
            echo "      🔗 Git repository found"
        fi
    else
        echo "   ❌ $path (NOT FOUND)"
    fi
done

# Check PM2 process info
echo ""
echo "🚀 PM2 Process Information:"
if command -v pm2 >/dev/null 2>&1; then
    pm2 describe ticket-backend-prod 2>/dev/null | grep -E "(cwd|script|status)" || echo "   ❌ ticket-backend-prod not found"
else
    echo "   ❌ PM2 not found"
fi

# Check environment variables
echo ""
echo "🌍 Environment Variables:"
echo "   PROJECT_DIR: ${PROJECT_DIR:-'not set'}"
echo "   NODE_ENV: ${NODE_ENV:-'not set'}"
echo "   PWD: ${PWD:-'not set'}"

# Check Git status
echo ""
echo "🔗 Git Repository Status:"
if [ -d "$(pwd)/.git" ]; then
    echo "   ✅ Git repository found in current directory"
    echo "   Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
    echo "   Last commit: $(git log -1 --oneline 2>/dev/null || echo 'unknown')"
else
    echo "   ❌ No Git repository in current directory"
fi

# Check script permissions
echo ""
echo "📄 Script Files Status:"
script_files=(
    "scripts/webhook-deploy.sh"
    "scripts/build-and-deploy.sh"
    "scripts/test-webhook.sh"
)

for script in "${script_files[@]}"; do
    if [ -f "$script" ]; then
        perms=$(ls -la "$script" | cut -d' ' -f1)
        echo "   ✅ $script ($perms)"
    else
        echo "   ❌ $script (NOT FOUND)"
    fi
done

# Suggest fixes
echo ""
echo "🔧 Suggested Fixes:"
echo "=================================="

# Find the actual project directory
actual_dir=""
for path in "${paths[@]}"; do
    if [ -f "$path/package.json" ] && [ -d "$path/.git" ]; then
        actual_dir="$path"
        break
    fi
done

if [ -n "$actual_dir" ]; then
    echo "1. ✅ Project found at: $actual_dir"
    echo "   Set environment variable: export PROJECT_DIR='$actual_dir'"
    echo ""
    
    # Check if webhook script exists there
    if [ ! -f "$actual_dir/scripts/webhook-deploy.sh" ]; then
        echo "2. 📄 Copy webhook-deploy.sh to the correct location:"
        echo "   cp $(pwd)/scripts/webhook-deploy.sh $actual_dir/scripts/"
        echo "   chmod +x $actual_dir/scripts/webhook-deploy.sh"
        echo ""
    fi
    
    echo "3. 🔄 Update NestJS app configuration:"
    echo "   Add to .env or ecosystem.config.js:"
    echo "   PROJECT_DIR=$actual_dir"
    echo ""
    
    echo "4. 🚀 Restart PM2 with environment variable:"
    echo "   pm2 stop ticket-backend-prod"
    echo "   PROJECT_DIR=$actual_dir pm2 start ecosystem.config.js --env production"
    
else
    echo "❌ No valid project directory found!"
    echo "   Make sure the project is properly deployed with:"
    echo "   - package.json"
    echo "   - .git directory"
    echo "   - scripts/webhook-deploy.sh"
fi

echo ""
echo "🧪 Test Commands:"
echo "=================================="
echo "# Test webhook endpoint:"
echo "curl -X POST http://localhost:3001/api/webhook/test"
echo ""
echo "# Test auto-deployment:"
echo "curl -X POST http://localhost:3001/api/webhook/deploy \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'User-Agent: GitHub-Hookshot/test' \\"
echo "  -d '{\"repository\":{\"name\":\"ticket-backend\"},\"ref\":\"refs/heads/feature/newfunction\",\"commits\":[{\"id\":\"test\"}]}'"
