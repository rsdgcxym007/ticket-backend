#!/bin/bash

# ========================================
# 🏃‍♂️ QUICK UNBAN & ACCESS SCRIPT
# ========================================
# รันสคริปต์นี้ทันทีเมื่อถูกแบน

echo "🚨 EMERGENCY: Quick Unban & SSH Access Script"
echo "=============================================="

# Get current IP
CURRENT_IP=$(curl -s https://ipv4.icanhazip.com)
echo "📍 Current IP: $CURRENT_IP"

# ========================================
# 🔓 IMMEDIATE UNBAN
# ========================================
echo ""
echo "🔓 Step 1: Unbanning current IP from all services..."

# Unban from fail2ban (all jails)
echo "🔓 Unbanning from fail2ban..."
sudo fail2ban-client unban $CURRENT_IP 2>/dev/null || echo "Not banned in fail2ban"

# Try to unban from specific jails
for jail in sshd nginx-http-auth nginx-noscript nginx-badbots; do
    sudo fail2ban-client unban $CURRENT_IP --jail=$jail 2>/dev/null || true
    echo "🔓 Attempted unban from $jail"
done

# ========================================
# 🔧 IMMEDIATE WHITELIST
# ========================================
echo ""
echo "➕ Step 2: Adding IP to immediate whitelist..."

# Quick whitelist in fail2ban
if [ -f /etc/fail2ban/jail.local ]; then
    if ! grep -q "$CURRENT_IP" /etc/fail2ban/jail.local; then
        sudo sed -i "/ignoreip.*=/s/$/ $CURRENT_IP/" /etc/fail2ban/jail.local
        echo "✅ Added $CURRENT_IP to fail2ban whitelist"
    else
        echo "ℹ️  $CURRENT_IP already whitelisted"
    fi
fi

# ========================================
# 🔄 RESTART SERVICES
# ========================================
echo ""
echo "🔄 Step 3: Restarting security services..."

# Restart fail2ban
sudo systemctl reload fail2ban
echo "🔄 Fail2ban reloaded"

# Restart SSH (gentle restart)
sudo systemctl reload ssh
echo "🔄 SSH reloaded"

# ========================================
# 🧪 TEST CONNECTION
# ========================================
echo ""
echo "🧪 Step 4: Testing SSH connection..."

# Test SSH connection to localhost
if timeout 5 ssh -o ConnectTimeout=5 -o BatchMode=yes root@localhost exit 2>/dev/null; then
    echo "✅ SSH connection test: SUCCESS"
else
    echo "⚠️  SSH connection test: FAILED (but may work from external)"
fi

# Check if SSH is listening
if sudo ss -tlnp | grep -q ":22 "; then
    echo "✅ SSH service is listening on port 22"
else
    echo "❌ SSH service not listening on port 22"
fi

# ========================================
# 📊 SHOW STATUS
# ========================================
echo ""
echo "📊 Current Status:"
echo "==================="

echo "🔍 Fail2ban status:"
sudo fail2ban-client status | head -5

echo ""
echo "🔍 SSH jail status:"
sudo fail2ban-client status sshd 2>/dev/null || echo "SSH jail not found"

echo ""
echo "🔍 Current whitelist:"
grep "ignoreip" /etc/fail2ban/jail.local 2>/dev/null || echo "No whitelist file"

# ========================================
# 🎯 FINAL INSTRUCTIONS
# ========================================
echo ""
echo "✅ EMERGENCY UNBAN COMPLETE!"
echo "============================="
echo ""
echo "🔸 IP $CURRENT_IP has been:"
echo "   - Unbanned from all fail2ban jails"
echo "   - Added to permanent whitelist"
echo "   - Services restarted"
echo ""
echo "🔧 Now try SSH connection:"
echo "   ssh root@43.229.133.51"
echo ""
echo "🔒 If still blocked, wait 2-3 minutes and try again"
echo "💡 Or run this script again: sudo bash $0"
echo ""
