#!/bin/bash

# ========================================
# 🔑 SSH SECURITY IMPROVEMENT SCRIPT
# ========================================
# ปรับปรุงความปลอดภัย SSH แต่ไม่ให้ยุ่งยาก

echo "🔧 Configuring SSH for Better Security & Usability..."

# Backup original SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup-$(date +%Y%m%d)

# Create improved SSH configuration
sudo tee -a /etc/ssh/sshd_config.d/99-custom-security.conf > /dev/null << 'EOF'
# ========================================
# 🛡️ CUSTOM SSH SECURITY CONFIGURATION
# ========================================

# Connection Settings
ClientAliveInterval 300        # Keep connections alive
ClientAliveCountMax 3         # Max 3 missed keepalives
LoginGraceTime 60s            # 60 seconds to login
MaxAuthTries 10               # Allow 10 password attempts
MaxSessions 10                # Allow 10 concurrent sessions

# Security Settings  
PermitRootLogin yes           # Allow root login (for deployment)
PasswordAuthentication yes    # Allow password auth
PubkeyAuthentication yes      # Allow key auth
AuthorizedKeysFile .ssh/authorized_keys

# Rate Limiting (Less Restrictive)
MaxStartups 15:30:20          # More generous connection limits

# Logging
LogLevel INFO                 # Standard logging
SyslogFacility AUTH          # Standard auth facility

# Protocol
Protocol 2                    # SSH Protocol 2 only
EOF

# ========================================
# 🔧 CONFIGURE SSH KEY AUTHENTICATION
# ========================================
echo "🔑 Setting up SSH key authentication..."

# Create .ssh directory for root if not exists
sudo mkdir -p /root/.ssh
sudo chmod 700 /root/.ssh

# Generate SSH key pair if not exists
if [ ! -f /root/.ssh/id_rsa ]; then
    echo "🔐 Generating SSH key pair..."
    sudo ssh-keygen -t rsa -b 4096 -f /root/.ssh/id_rsa -N "" -C "root@patong-boxing-server"
fi

# Set proper permissions
sudo chmod 600 /root/.ssh/id_rsa
sudo chmod 644 /root/.ssh/id_rsa.pub

# ========================================
# 🔄 APPLY CONFIGURATION
# ========================================
echo "🔄 Testing and applying SSH configuration..."

# Test SSH configuration
if sudo sshd -t; then
    echo "✅ SSH configuration is valid"
    sudo systemctl restart ssh
    sudo systemctl enable ssh
    echo "🔄 SSH service restarted"
else
    echo "❌ SSH configuration error - reverting to backup"
    sudo rm /etc/ssh/sshd_config.d/99-custom-security.conf
    sudo systemctl restart ssh
    exit 1
fi

# ========================================
# 📊 DISPLAY STATUS
# ========================================
echo ""
echo "📊 SSH Service Status:"
sudo systemctl status ssh --no-pager -l

echo ""
echo "🔍 SSH Configuration Test:"
sudo sshd -T | grep -E "(MaxAuthTries|LoginGraceTime|ClientAliveInterval)"

echo ""
echo "✅ SSH Security Configuration Complete!"
echo "🔸 MaxAuthTries: 10 (instead of 6)"
echo "🔸 Connection timeout: 5 minutes"
echo "🔸 Root login: Enabled"
echo "🔸 Both password & key auth: Enabled"
echo ""
