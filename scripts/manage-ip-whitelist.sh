#!/bin/bash

# ========================================
# 🔓 IP WHITELIST MANAGEMENT SCRIPT
# ========================================
# จัดการรายการ IP ที่ไม่ต้องการให้ถูกแบน

echo "🔧 Managing IP Whitelist for Fail2ban..."

# Function to add IP to whitelist
add_ip_to_whitelist() {
    local ip=$1
    local description=$2
    
    echo "➕ Adding IP $ip ($description) to whitelist..."
    
    # Add to fail2ban ignore list
    if ! grep -q "$ip" /etc/fail2ban/jail.local; then
        sudo sed -i "/ignoreip.*=/s/$/ $ip/" /etc/fail2ban/jail.local
        echo "✅ Added $ip to fail2ban whitelist"
    else
        echo "ℹ️  IP $ip already in whitelist"
    fi
}

# Function to unban IP immediately
unban_ip() {
    local ip=$1
    echo "🔓 Unbanning IP $ip from all jails..."
    
    # Get all active jails
    jails=$(sudo fail2ban-client status | grep "Jail list:" | sed 's/.*Jail list:\s*//' | tr ',' ' ')
    
    for jail in $jails; do
        jail=$(echo $jail | xargs) # trim whitespace
        if [ ! -z "$jail" ]; then
            sudo fail2ban-client unban $ip --jail=$jail 2>/dev/null || true
            echo "🔓 Unbanned $ip from jail: $jail"
        fi
    done
}

# ========================================
# 🌐 GET CURRENT PUBLIC IP
# ========================================
echo "🔍 Detecting current public IP addresses..."

# Try multiple IP detection services
CURRENT_IPS=()

# Method 1: icanhazip.com
ip1=$(curl -s --connect-timeout 5 https://ipv4.icanhazip.com 2>/dev/null)
if [[ $ip1 =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    CURRENT_IPS+=("$ip1")
    echo "📍 IP from icanhazip: $ip1"
fi

# Method 2: ipinfo.io
ip2=$(curl -s --connect-timeout 5 https://ipinfo.io/ip 2>/dev/null)
if [[ $ip2 =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    CURRENT_IPS+=("$ip2")
    echo "📍 IP from ipinfo: $ip2"
fi

# Method 3: httpbin.org
ip3=$(curl -s --connect-timeout 5 https://httpbin.org/ip | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+' 2>/dev/null)
if [[ $ip3 =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    CURRENT_IPS+=("$ip3")
    echo "📍 IP from httpbin: $ip3"
fi

# Remove duplicates
UNIQUE_IPS=($(printf "%s\n" "${CURRENT_IPS[@]}" | sort -u))

# ========================================
# 📝 COMMON DEVELOPMENT IP RANGES
# ========================================
DEVELOPMENT_IPS=(
    "58.11.188.245"        # Current detected IP
    "103.0.0.0/8"          # Thai ISP range
    "49.0.0.0/8"           # Thai ISP range  
    "1.0.0.0/8"            # Thai ISP range
    "27.0.0.0/8"           # Thai ISP range
    "125.0.0.0/8"          # Thai ISP range
    "202.0.0.0/8"          # APNIC range
    "203.0.0.0/8"          # APNIC range
)

# ========================================
# 🔓 UNBAN ALL DETECTED IPs
# ========================================
echo ""
echo "🔓 Unbanning all detected IPs..."

for ip in "${UNIQUE_IPS[@]}"; do
    if [ ! -z "$ip" ]; then
        unban_ip "$ip"
    fi
done

# Also unban known development IP
unban_ip "58.11.188.245"

# ========================================
# ➕ ADD IPs TO WHITELIST
# ========================================
echo ""
echo "➕ Adding IPs to permanent whitelist..."

# Add detected IPs
for ip in "${UNIQUE_IPS[@]}"; do
    if [ ! -z "$ip" ]; then
        add_ip_to_whitelist "$ip" "Auto-detected current IP"
    fi
done

# Add development IP ranges
for ip_range in "${DEVELOPMENT_IPS[@]}"; do
    add_ip_to_whitelist "$ip_range" "Development IP range"
done

# ========================================
# 🔄 RELOAD FAIL2BAN
# ========================================
echo ""
echo "🔄 Reloading fail2ban configuration..."
sudo systemctl reload fail2ban

# Wait for reload
sleep 3

# ========================================
# 📊 SHOW STATUS
# ========================================
echo ""
echo "📊 Current Fail2ban Status:"
sudo fail2ban-client status

echo ""
echo "🔍 SSH Jail Status:"
sudo fail2ban-client status sshd 2>/dev/null || echo "SSH jail not active"

echo ""
echo "📋 Current Whitelist IPs:"
grep "ignoreip" /etc/fail2ban/jail.local

echo ""
echo "✅ IP Whitelist Management Complete!"
echo "🔸 Detected IPs: ${UNIQUE_IPS[*]}"
echo "🔸 All IPs unbanned from all jails"
echo "🔸 IPs added to permanent whitelist"
echo "🔸 Fail2ban configuration reloaded"
echo ""
