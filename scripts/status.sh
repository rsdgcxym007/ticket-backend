#!/bin/bash

# Quick Server Status Dashboard
# Usage: ./status.sh

SERVER_IP="43.229.133.51"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}   Patong Boxing Stadium Server Status   ${NC}"
echo -e "${CYAN}===========================================${NC}"
echo ""

# 1. Memory Status
echo -e "${BLUE}🧠 Memory Status:${NC}"
MEMORY_INFO=$(ssh root@$SERVER_IP "free -m")
USED_MEMORY=$(ssh root@$SERVER_IP "free -m | awk 'NR==2{print \$3}'")
TOTAL_MEMORY=$(ssh root@$SERVER_IP "free -m | awk 'NR==2{print \$2}'")
AVAILABLE_MEMORY=$(ssh root@$SERVER_IP "free -m | awk 'NR==2{print \$7}'")
USAGE_PERCENT=$(echo "scale=1; $USED_MEMORY * 100 / $TOTAL_MEMORY" | bc -l 2>/dev/null || echo "N/A")

if [ "$USED_MEMORY" -gt 2000 ]; then
    STATUS_COLOR=$RED
    STATUS_ICON="🔴"
elif [ "$USED_MEMORY" -gt 1500 ]; then
    STATUS_COLOR=$YELLOW
    STATUS_ICON="🟡"
else
    STATUS_COLOR=$GREEN
    STATUS_ICON="🟢"
fi

echo -e "   ${STATUS_ICON} ${STATUS_COLOR}${USED_MEMORY}MB / ${TOTAL_MEMORY}MB (${USAGE_PERCENT}%)${NC}"
echo -e "   Available: ${AVAILABLE_MEMORY}MB"

# 2. Backend Services
echo ""
echo -e "${BLUE}⚙️  Backend Services:${NC}"
PM2_STATUS=$(ssh root@$SERVER_IP "pm2 jlist" 2>/dev/null)

if [ $? -eq 0 ]; then
    ONLINE_COUNT=$(echo "$PM2_STATUS" | grep -o '"status":"online"' | wc -l)
    TOTAL_COUNT=$(echo "$PM2_STATUS" | grep -o '"name":' | wc -l)
    
    if [ "$ONLINE_COUNT" -eq "$TOTAL_COUNT" ] && [ "$ONLINE_COUNT" -gt 0 ]; then
        echo -e "   🟢 All services online (${ONLINE_COUNT}/${TOTAL_COUNT})"
    elif [ "$ONLINE_COUNT" -gt 0 ]; then
        echo -e "   🟡 Some services down (${ONLINE_COUNT}/${TOTAL_COUNT})"
    else
        echo -e "   🔴 All services down (${ONLINE_COUNT}/${TOTAL_COUNT})"
    fi
    
    # Show individual service status
    ssh root@$SERVER_IP "pm2 list --no-header" | while read line; do
        if echo "$line" | grep -q "online"; then
            SERVICE_NAME=$(echo "$line" | awk '{print $2}')
            SERVICE_MEMORY=$(echo "$line" | awk '{print $10}')
            echo -e "   └─ 🟢 $SERVICE_NAME ($SERVICE_MEMORY)"
        elif echo "$line" | grep -q "stopped\|errored"; then
            SERVICE_NAME=$(echo "$line" | awk '{print $2}')
            echo -e "   └─ 🔴 $SERVICE_NAME (stopped)"
        fi
    done
else
    echo -e "   🔴 PM2 not accessible"
fi

# 3. System Load
echo ""
echo -e "${BLUE}📊 System Load:${NC}"
LOAD_INFO=$(ssh root@$SERVER_IP "uptime")
LOAD_AVG=$(echo "$LOAD_INFO" | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
UPTIME=$(echo "$LOAD_INFO" | awk '{print $3, $4}' | sed 's/,//')

LOAD_NUM=$(echo "$LOAD_AVG" | cut -d'.' -f1)
if [ "$LOAD_NUM" -gt 2 ]; then
    LOAD_COLOR=$RED
    LOAD_ICON="🔴"
elif [ "$LOAD_NUM" -gt 1 ]; then
    LOAD_COLOR=$YELLOW
    LOAD_ICON="🟡"
else
    LOAD_COLOR=$GREEN
    LOAD_ICON="🟢"
fi

echo -e "   ${LOAD_ICON} Load Average: ${LOAD_COLOR}${LOAD_AVG}${NC}"
echo -e "   Uptime: $UPTIME"

# 4. Disk Space
echo ""
echo -e "${BLUE}💾 Disk Space:${NC}"
DISK_INFO=$(ssh root@$SERVER_IP "df -h / | awk 'NR==2 {print \$5, \$4}'" | tr ' ' '\n')
DISK_USAGE=$(echo "$DISK_INFO" | head -1 | sed 's/%//')
DISK_AVAILABLE=$(echo "$DISK_INFO" | tail -1)

if [ "$DISK_USAGE" -gt 90 ]; then
    DISK_COLOR=$RED
    DISK_ICON="🔴"
elif [ "$DISK_USAGE" -gt 80 ]; then
    DISK_COLOR=$YELLOW
    DISK_ICON="🟡"
else
    DISK_COLOR=$GREEN
    DISK_ICON="🟢"
fi

echo -e "   ${DISK_ICON} Used: ${DISK_COLOR}${DISK_USAGE}%${NC}"
echo -e "   Available: $DISK_AVAILABLE"

# 5. Network Status
echo ""
echo -e "${BLUE}🌐 Network Services:${NC}"

# Check main API
API_STATUS=$(ssh root@$SERVER_IP "curl -s -w '%{http_code}' -o /dev/null http://localhost:4000/ --max-time 5" 2>/dev/null)
if [ "$API_STATUS" = "404" ] || [ "$API_STATUS" = "200" ]; then
    echo -e "   🟢 Main API (Port 4000): Online"
else
    echo -e "   🔴 Main API (Port 4000): Offline"
fi

# Check webhook service
WEBHOOK_STATUS=$(ssh root@$SERVER_IP "curl -s -w '%{http_code}' -o /dev/null http://localhost:4200/hooks/deploy-backend-master -X POST --max-time 5" 2>/dev/null)
if [ "$WEBHOOK_STATUS" = "200" ] || [ "$WEBHOOK_STATUS" = "400" ]; then
    echo -e "   🟢 Webhook Service (Port 4200): Online"
else
    echo -e "   🔴 Webhook Service (Port 4200): Offline"
fi

# 6. Quick Actions
echo ""
echo -e "${PURPLE}🚀 Quick Actions:${NC}"
echo -e "   ./scripts/memory-monitor.sh check    - Check memory"
echo -e "   ./scripts/memory-monitor.sh clear    - Clear cache" 
echo -e "   ./scripts/maintenance.sh daily       - Daily maintenance"
echo -e "   ./scripts/maintenance.sh emergency   - Emergency fix"

echo ""
echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}     Status check completed at $(date)     ${NC}"
echo -e "${CYAN}===========================================${NC}"
