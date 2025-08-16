#!/bin/bash

# ========================================
# 📋 COPY-PASTE COMMANDS FOR VPS CONSOLE
# ========================================
# ใช้สำหรับ copy-paste ใน VPS console

echo "🚨 EMERGENCY IP UNBAN - VPS Console Commands"
echo "============================================="
echo ""

# Step 1: Get current IP and unban immediately
echo "# Step 1: Immediate Unban"
echo "CURRENT_IP=\$(curl -s https://ipv4.icanhazip.com)"
echo "echo \"📍 Current IP: \$CURRENT_IP\""
echo ""
echo "# Unban from fail2ban"
echo "fail2ban-client unban \$CURRENT_IP 2>/dev/null || echo \"Not banned\""
echo "fail2ban-client unban 58.11.188.245 2>/dev/null || echo \"Static IP not banned\""
echo ""

# Step 2: Quick whitelist
echo "# Step 2: Quick Whitelist"
echo "if [ -f /etc/fail2ban/jail.local ]; then"
echo "  if ! grep -q \"\$CURRENT_IP\" /etc/fail2ban/jail.local; then"
echo "    sed -i \"/ignoreip.*=/s/\$/ \$CURRENT_IP/\" /etc/fail2ban/jail.local"
echo "    echo \"✅ Added \$CURRENT_IP to whitelist\""
echo "  fi"
echo "fi"
echo ""

# Step 3: Create improved fail2ban config
echo "# Step 3: Create Better Fail2ban Config"
echo "cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.conf.backup-\$(date +%Y%m%d) 2>/dev/null || true"
echo ""
echo "cat > /etc/fail2ban/jail.local << 'EOF'"
echo "[DEFAULT]"
echo "bantime  = 1800"
echo "findtime = 600"
echo "maxretry = 10"
echo "ignoreip = 127.0.0.1/8 ::1 58.11.188.245 103.0.0.0/8 49.0.0.0/8 1.0.0.0/8"
echo ""
echo "[sshd]"
echo "enabled = true"
echo "port = ssh,22,2222"
echo "filter = sshd"
echo "logpath = /var/log/auth.log"
echo "maxretry = 10"
echo "bantime = 1800"
echo "findtime = 600"
echo "EOF"
echo ""

# Step 4: Restart services
echo "# Step 4: Restart Services"
echo "systemctl reload fail2ban"
echo "systemctl reload ssh"
echo "echo \"🔄 Services restarted\""
echo ""

# Step 5: Show status
echo "# Step 5: Check Status"
echo "fail2ban-client status"
echo "fail2ban-client status sshd 2>/dev/null || echo \"SSH jail not active\""
echo "ss -tlnp | grep :22"
echo ""

echo "# ✅ Complete! Try SSH now:"
echo "# ssh root@43.229.133.51"
echo ""
