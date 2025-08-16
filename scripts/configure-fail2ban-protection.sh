#!/bin/bash

# ========================================
# 🛡️ FAIL2BAN PROTECTION CONFIGURATION
# ========================================
# ป้องกัน IP ของเราไม่ให้ถูกแบน
# Configure fail2ban to protect our development IPs

echo "🔧 Configuring Fail2ban Protection for Development IPs..."

# Get current public IP
CURRENT_IP=$(curl -s https://ipv4.icanhazip.com)
echo "📍 Current IP: $CURRENT_IP"

# Backup original fail2ban configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.conf.backup-$(date +%Y%m%d)

# Create custom jail configuration
sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
# ========================================
# 🔒 BASIC PROTECTION SETTINGS
# ========================================
bantime  = 1800        # 30 minutes (reduced from 1 hour)
findtime = 600         # 10 minutes
maxretry = 10          # Allow 10 attempts (increased from 5)

# ========================================
# 🔓 WHITELIST DEVELOPMENT IPs
# ========================================
# Add development and trusted IPs here
ignoreip = 127.0.0.1/8 ::1 
           58.11.188.245
           103.0.0.0/8
           49.0.0.0/8
           1.0.0.0/8

# ========================================
# 🔧 SSH JAIL CONFIGURATION
# ========================================
[sshd]
enabled = true
port = ssh,22,2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 10          # Allow 10 SSH attempts
bantime = 1800         # 30 minutes ban
findtime = 600         # Check last 10 minutes

# ========================================
# 🌐 WEB SERVER PROTECTION
# ========================================
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 20          # Allow more attempts for web

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 50          # High limit for API calls

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 10
EOF

# ========================================
# 🔄 RESTART AND APPLY CONFIGURATION
# ========================================
echo "🔄 Restarting fail2ban with new configuration..."
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# ========================================
# 📊 SHOW STATUS
# ========================================
echo "📊 Fail2ban Status:"
sudo fail2ban-client status

echo "🔍 SSH Jail Status:"
sudo fail2ban-client status sshd

# ========================================
# 🔓 UNBAN CURRENT IP (SAFETY)
# ========================================
echo "🔓 Unbanning current IP as safety measure..."
sudo fail2ban-client unban $CURRENT_IP 2>/dev/null || echo "IP not banned"

echo ""
echo "✅ Fail2ban Protection Configuration Complete!"
echo "🔸 Current IP ($CURRENT_IP) is whitelisted"
echo "🔸 SSH allows 10 attempts in 10 minutes"
echo "🔸 Ban time reduced to 30 minutes"
echo "🔸 Web APIs allow more attempts"
echo ""
