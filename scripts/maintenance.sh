#!/bin/bash

# Preventive Maintenance Script
# Usage: ./maintenance.sh [daily|weekly|emergency]

SERVER_IP="43.229.133.51"
LOG_FILE="/tmp/maintenance-$(date +%Y%m%d).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

daily_maintenance() {
    echo -e "${BLUE}=== Daily Maintenance Started ===${NC}"
    log_message "Starting daily maintenance"
    
    # 1. Clear system cache
    echo -e "${YELLOW}1. Clearing system cache...${NC}"
    ssh root@$SERVER_IP "sync && echo 3 > /proc/sys/vm/drop_caches"
    
    # 2. Check disk space
    echo -e "${YELLOW}2. Checking disk space...${NC}"
    local disk_usage=$(ssh root@$SERVER_IP "df -h / | awk 'NR==2 {print \$5}' | sed 's/%//'")
    if [ "$disk_usage" -gt 80 ]; then
        echo -e "${RED}⚠️  Disk usage high: ${disk_usage}%${NC}"
        log_message "HIGH DISK USAGE: ${disk_usage}%"
    else
        echo -e "${GREEN}✅ Disk usage OK: ${disk_usage}%${NC}"
    fi
    
    # 3. Clean old logs
    echo -e "${YELLOW}3. Cleaning old logs...${NC}"
    ssh root@$SERVER_IP "
        find /var/log/pm2/ -name '*.log' -mtime +3 -delete 2>/dev/null || true
        find /var/log/ -name '*memory*.log' -mtime +7 -delete 2>/dev/null || true
    "
    
    # 4. Check PM2 status
    echo -e "${YELLOW}4. Checking PM2 processes...${NC}"
    local pm2_status=$(ssh root@$SERVER_IP "pm2 list | grep -c 'online'")
    echo -e "Active processes: ${pm2_status}"
    
    # 5. Memory status
    echo -e "${YELLOW}5. Memory status...${NC}"
    ./scripts/memory-monitor.sh check
    
    log_message "Daily maintenance completed"
    echo -e "${GREEN}✅ Daily maintenance completed${NC}"
}

weekly_maintenance() {
    echo -e "${BLUE}=== Weekly Maintenance Started ===${NC}"
    log_message "Starting weekly maintenance"
    
    # Run daily maintenance first
    daily_maintenance
    
    echo -e "${YELLOW}6. Restarting backend services...${NC}"
    ssh root@$SERVER_IP "
        pm2 restart all
        sleep 10
        pm2 save
    "
    
    # 7. System updates check (without installing)
    echo -e "${YELLOW}7. Checking for system updates...${NC}"
    local updates=$(ssh root@$SERVER_IP "apt list --upgradable 2>/dev/null | grep -c upgradable" || echo "0")
    if [ "$updates" -gt 0 ]; then
        echo -e "${YELLOW}📦 ${updates} updates available${NC}"
        log_message "${updates} system updates available"
    else
        echo -e "${GREEN}✅ System up to date${NC}"
    fi
    
    # 8. Security check
    echo -e "${YELLOW}8. Security status...${NC}"
    ssh root@$SERVER_IP "
        echo 'Fail2ban status:'
        fail2ban-client status | grep 'Number of jail' || echo 'Fail2ban not running'
        echo 'UFW status:'
        ufw status | head -2
    "
    
    log_message "Weekly maintenance completed"
    echo -e "${GREEN}✅ Weekly maintenance completed${NC}"
}

emergency_maintenance() {
    echo -e "${RED}=== Emergency Maintenance Started ===${NC}"
    log_message "Starting emergency maintenance - HIGH MEMORY/CPU"
    
    # 1. Immediate cache clear
    echo -e "${RED}1. Emergency cache clear...${NC}"
    ssh root@$SERVER_IP "
        sync && echo 3 > /proc/sys/vm/drop_caches
        echo 'Emergency cache cleared'
    "
    
    # 2. Kill high memory processes (except backend)
    echo -e "${RED}2. Checking for memory hogs...${NC}"
    ssh root@$SERVER_IP "
        ps aux --sort=-%mem | head -10 | grep -v 'patong-boxing\|webhook\|postgres\|nginx'
    "
    
    # 3. Force restart backend
    echo -e "${RED}3. Force restarting backend...${NC}"
    ssh root@$SERVER_IP "
        pm2 delete patong-boxing-api 2>/dev/null || true
        sleep 3
        cd /var/www/patong-boxing
        pm2 start ecosystem.config.js
    "
    
    # 4. Check services
    echo -e "${RED}4. Verifying services...${NC}"
    sleep 10
    ssh root@$SERVER_IP "
        pm2 list
        curl -s -w 'HTTP: %{http_code}' http://localhost:4000/ | head -1
        curl -s -w 'HTTP: %{http_code}' http://localhost:4200/hooks/deploy-backend-master -X POST | head -1
    "
    
    # 5. Final memory check
    echo -e "${RED}5. Post-emergency memory check...${NC}"
    ./scripts/memory-monitor.sh check
    
    log_message "Emergency maintenance completed"
    echo -e "${GREEN}✅ Emergency maintenance completed${NC}"
}

show_help() {
    echo "Maintenance Script for Patong Boxing Stadium"
    echo ""
    echo "Usage: $0 [daily|weekly|emergency]"
    echo ""
    echo "Commands:"
    echo "  daily     - Daily maintenance (cache clear, log cleanup, checks)"
    echo "  weekly    - Weekly maintenance (daily + restart services + updates check)"
    echo "  emergency - Emergency maintenance (immediate memory cleanup + restart)"
    echo ""
    echo "Examples:"
    echo "  $0 daily"
    echo "  $0 weekly"
    echo "  $0 emergency"
}

# Main script logic
case "${1:-daily}" in
    "daily")
        daily_maintenance
        ;;
    "weekly")
        weekly_maintenance
        ;;
    "emergency")
        emergency_maintenance
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
