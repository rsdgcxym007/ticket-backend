#!/bin/bash

# Quick Fix for Auto-Deploy Syntax Error
# Run this on the server to immediately fix the deployment script

set -euo pipefail

echo "🚨 Quick Fix: Auto-Deploy Syntax Error"
echo "====================================="

PROJECT_DIR="/var/www/backend/ticket-backend"
SCRIPT_PATH="$PROJECT_DIR/monitoring/auto-deploy.sh"

# Check if script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Script not found: $SCRIPT_PATH"
    exit 1
fi

echo "📝 Backing up current script..."
cp "$SCRIPT_PATH" "$SCRIPT_PATH.backup.$(date +%Y%m%d-%H%M%S)"

echo "🔧 Applying syntax fix..."

# Fix the malformed if-else structure around line 147
sed -i '/npm install.*--engine-strict=false; then/,/fi$/{
    # Replace the malformed else with proper structure
    s/                else/            else/
    /ERROR: npm not available or installation failed/,/fi$/{
        /else$/,/fi$/{
            # Remove the incorrectly placed else block
            /else$/d
            /log_message.*ERROR: npm not available/d
            /send_notification.*Package manager not available/d
            /exit 1/d
            /fi$/d
        }
    }
}' "$SCRIPT_PATH"

echo "✅ Testing script syntax..."
if bash -n "$SCRIPT_PATH"; then
    echo "✅ Syntax is now valid!"
    echo "🚀 You can now run deployment:"
    echo "   bash $SCRIPT_PATH deploy"
else
    echo "❌ Syntax still has issues. Restoring backup..."
    mv "$SCRIPT_PATH.backup."* "$SCRIPT_PATH"
    echo "Manual fix required."
    exit 1
fi

echo ""
echo "🎉 Quick fix completed successfully!"
echo "The deployment script syntax error has been resolved."
