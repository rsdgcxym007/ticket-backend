#!/bin/bash

# Memory Cleanup Script
# Runs every 5 minutes to prevent memory bloat

LOG_FILE="/var/log/memory-cleanup.log"

# Log function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check memory usage
check_memory() {
    local total_mem=$(free -m | awk 'NR==2{printf "%d", $2}')
    local used_mem=$(free -m | awk 'NR==2{printf "%d", $3}')
    local mem_percentage=$((used_mem * 100 / total_mem))
    
    echo "$mem_percentage"
}

# Get PM2 memory usage
get_pm2_memory() {
    pm2 jlist | jq -r '.[] | select(.name=="ticket-backend-prod") | .pid' | xargs -I {} cat /proc/{}/status 2>/dev/null | grep VmRSS | awk '{print $2}'
}

# Main cleanup process
main() {
    log_message "Starting memory cleanup check..."
    
    # Check overall system memory
    local mem_percent=$(check_memory)
    log_message "System memory usage: ${mem_percent}%"
    
    # Check PM2 app memory
    local app_memory=$(get_pm2_memory)
    if [ -n "$app_memory" ]; then
        local app_memory_mb=$((app_memory / 1024))
        log_message "App memory usage: ${app_memory_mb}MB"
        
        # If app uses more than 150MB, restart it
        if [ "$app_memory_mb" -gt 150 ]; then
            log_message "App memory too high (${app_memory_mb}MB), restarting..."
            pm2 restart ticket-backend-prod
        fi
    fi
    
    # If system memory over 80%, clean up
    if [ "$mem_percent" -gt 80 ]; then
        log_message "High memory usage detected (${mem_percent}%), cleaning up..."
        
        # Clean caches
        sync
        echo 3 > /proc/sys/vm/drop_caches
        
        # Clean temp files older than 1 hour
        find /tmp -name "*.tmp" -o -name "yarn--*" -o -name "*.log" -mmin +60 -delete 2>/dev/null || true
        
        log_message "Cleanup completed"
    fi
    
    log_message "Memory cleanup check finished"
}

main "$@"
