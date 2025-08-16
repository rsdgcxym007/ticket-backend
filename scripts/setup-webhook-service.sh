#!/bin/bash

# 🚀 Setup Webhook Service Script
# Patong Boxing Stadium Ticket System - External Webhook Service

set -e

echo "🚀 Setting up webhook service on port 4200..."

# 1. Create systemd service file
echo "📝 Creating systemd service file..."
cat > /etc/systemd/system/webhook-deploy.service << 'EOF'
[Unit]
Description=Webhook Deployment Service for Patong Boxing Stadium
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/var/www/backend/ticket-backend
ExecStart=/usr/bin/webhook -hooks /etc/webhook.conf -verbose -port 4200
Restart=always
RestartSec=10
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 2. Create PM2 ecosystem file for webhook service (alternative approach)
echo "📝 Creating PM2 ecosystem file..."
mkdir -p /var/www/webhook-service
cat > /var/www/webhook-service/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'webhook-deploy-service',
    script: '/usr/bin/webhook',
    args: ['-hooks', '/etc/webhook.conf', '-verbose', '-port', '4200'],
    cwd: '/var/www/backend/ticket-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/webhook-deploy-error.log',
    out_file: '/var/log/webhook-deploy-output.log',
    log_file: '/var/log/webhook-deploy.log'
  }]
};
EOF

# 3. Open firewall port 4200
echo "🔥 Opening firewall port 4200..."
ufw allow 4200/tcp || echo "UFW not installed or already configured"

# 4. Test webhook configuration
echo "🔍 Testing webhook configuration..."
webhook -hooks /etc/webhook.conf -list-hooks || echo "Webhook config test completed"

# 5. Start webhook service using PM2 (preferred method)
echo "🚀 Starting webhook service with PM2..."
cd /var/www/webhook-service
pm2 start ecosystem.config.js
pm2 save

# 6. Alternative: Enable systemd service (commented out)
# echo "🚀 Enabling webhook systemd service..."
# systemctl daemon-reload
# systemctl enable webhook-deploy.service
# systemctl start webhook-deploy.service

echo "✅ Webhook service setup completed!"
echo "📊 Service Status:"
pm2 status | grep webhook || echo "Webhook service status check completed"

echo "🌐 Webhook endpoints available at:"
echo "  - http://43.229.133.51:4200/hooks/deploy-backend-master"
echo "  - http://43.229.133.51:4200/hooks/deploy-frontend"

echo "🔗 You can test with:"
echo "  curl -X POST http://43.229.133.51:4200/hooks/deploy-backend-master"
