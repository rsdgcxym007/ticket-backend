#!/bin/bash

# Memory Monitor Script for Patong Boxing Stadium
# Usage: ./memory-monitor.sh [check|clear|restart|full]

SERVER_IP="43.229.133.51"
MEMORY_THRESHOLD=2000  # MB
LOG_FILE="/tmp/memory-monitor-$(date +%Y%m%d).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

check_memory() {
    echo -e "${YELLOW}=== Memory Status Check ===${NC}"
    
    # Get memory info
    local memory_info=$(ssh root@$SERVER_IP "free -m")
    local used_memory=$(ssh root@$SERVER_IP "free -m | awk 'NR==2{print \$3}'")
    local total_memory=$(ssh root@$SERVER_IP "free -m | awk 'NR==2{print \$2}'")
    local available_memory=$(ssh root@$SERVER_IP "free -m | awk 'NR==2{print \$7}'")
    local cache_memory=$(ssh root@$SERVER_IP "free -m | awk 'NR==2{print \$6}'")
    
    echo "$memory_info"
    echo ""
    
    # Calculate percentage
    local usage_percent=$(echo "scale=1; $used_memory * 100 / $total_memory" | bc -l 2>/dev/null || echo "N/A")
    
    echo -e "Total RAM: ${total_memory} MB"
    echo -e "Used RAM: ${used_memory} MB (${usage_percent}%)"
    echo -e "Available: ${available_memory} MB"
    echo -e "Cache/Buffer: ${cache_memory} MB"
    
    # Check if memory usage is high
    if [ "$used_memory" -gt "$MEMORY_THRESHOLD" ]; then
        echo -e "${RED}⚠️  HIGH MEMORY USAGE DETECTED!${NC}"
        log_message "HIGH MEMORY USAGE: ${used_memory}MB (Threshold: ${MEMORY_THRESHOLD}MB)"
        return 1
    else
        echo -e "${GREEN}✅ Memory usage is normal${NC}"
        return 0
    fi
}

check_processes() {
    echo -e "${YELLOW}=== Backend Processes Status ===${NC}"
    
    local pm2_status=$(ssh root@$SERVER_IP "pm2 list")
    echo "$pm2_status"
    echo ""
    
    local node_processes=$(ssh root@$SERVER_IP "ps aux | grep -E 'patong-boxing|webhook' | grep -v grep")
    echo "Backend Memory Usage:"
    echo "$node_processes" | awk '{print $1, $11, $6"KB"}' | sort
}

clear_cache() {
    echo -e "${YELLOW}=== Clearing System Cache ===${NC}"
    
    ssh root@$SERVER_IP "
        echo 'Clearing page cache, dentries and inodes...'
        sync && echo 3 > /proc/sys/vm/drop_caches
        echo 'Cache cleared successfully'
    "
    
    log_message "System cache cleared"
    echo -e "${GREEN}✅ Cache cleared${NC}"
}

restart_backend() {
    echo -e "${YELLOW}=== Restarting Backend Services ===${NC}"
    
    ssh root@$SERVER_IP "
        echo 'Restarting patong-boxing-api...'
        pm2 restart patong-boxing-api
        sleep 5
        pm2 list
    "
    
    log_message "Backend services restarted"
    echo -e "${GREEN}✅ Backend restarted${NC}"
}

install_monitoring() {
    echo -e "${YELLOW}=== Installing Monitoring Cron Job ===${NC}"
    
    # Create remote monitoring script
    ssh root@$SERVER_IP "
cat > /usr/local/bin/auto-memory-monitor.sh << 'EOF'
#!/bin/bash
THRESHOLD=2000
USED=\\\$(free -m | awk 'NR==2{print \\\$3}')

if [ \\\$USED -gt \\\$THRESHOLD ]; then
    echo \"\\\$(date): HIGH MEMORY: \\\${USED}MB\" >> /var/log/memory-alert.log
    
    # Clear cache first
    sync && echo 3 > /proc/sys/vm/drop_caches
    
    # Check again
    USED_AFTER=\\\$(free -m | awk 'NR==2{print \\\$3}')
    if [ \\\$USED_AFTER -gt \\\$THRESHOLD ]; then
        echo \"\\\$(date): Restarting backend - Memory: \\\${USED_AFTER}MB\" >> /var/log/memory-alert.log
        /usr/bin/pm2 restart patong-boxing-api
    fi
fi
EOF

chmod +x /usr/local/bin/auto-memory-monitor.sh

# Add to crontab (every 5 minutes)
grep -q 'auto-memory-monitor' /etc/crontab || echo '*/5 * * * * root /usr/local/bin/auto-memory-monitor.sh' >> /etc/crontab

systemctl restart cron
"
    
    echo -e "${GREEN}✅ Auto monitoring installed (runs every 5 minutes)${NC}"
    log_message "Auto monitoring cron job installed"
}

full_check() {
    echo -e "${YELLOW}=== Full System Check ===${NC}"
    
    check_memory
    local memory_status=$?
    
    echo ""
    check_processes
    
    if [ $memory_status -eq 1 ]; then
        echo ""
        echo -e "${RED}Performing automatic cleanup...${NC}"
        clear_cache
        
        # Wait and check again
        sleep 5
        check_memory
        local memory_status_after=$?
        
        if [ $memory_status_after -eq 1 ]; then
            echo ""
            echo -e "${RED}Memory still high, restarting backend...${NC}"
            restart_backend
        fi
    fi
}

show_help() {
    echo "Memory Monitor Script for Patong Boxing Stadium"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  check     - Check current memory usage"
    echo "  processes - Show backend processes status"
    echo "  clear     - Clear system cache"
    echo "  restart   - Restart backend services"
    echo "  install   - Install auto monitoring cron job"
    echo "  full      - Run full check with auto-cleanup"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 check"
    echo "  $0 full"
    echo "  $0 install"
}

# Main script logic
case "${1:-check}" in
    "check")
        check_memory
        ;;
    "processes")
        check_processes
        ;;
    "clear")
        clear_cache
        ;;
    "restart")
        restart_backend
        ;;
    "install")
        install_monitoring
        ;;
    "full")
        full_check
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
