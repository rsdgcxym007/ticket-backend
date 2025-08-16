#!/bin/bash

# System Monitoring Script for Patong Boxing Stadium API
# Monitors CPU, Memory, Disk, PM2 processes and sends Discord notifications

# Configuration
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
PM2_APP_NAME="ticket-backend-prod"
LOG_FILE="/var/log/system-monitor.log"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=85
PROCESS_RESTART_THRESHOLD=5

# Colors for Discord embeds
COLOR_GREEN=5763719
COLOR_YELLOW=16776960
COLOR_RED=15158332
COLOR_BLUE=3447003

# Get timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Logging function
log_message() {
    echo "[$(get_timestamp)] $1" >> "$LOG_FILE"
    echo "[$(get_timestamp)] $1"
}

# Send Discord notification function
send_discord_notification() {
    local title="$1"
    local description="$2"
    local color="$3"
    local fields="$4"
    
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{
             \"embeds\": [{
                 \"title\": \"🖥️ $title\",
                 \"description\": \"$description\",
                 \"color\": $color,
                 \"fields\": [$fields],
                 \"footer\": {
                     \"text\": \"Patong Boxing Stadium API Monitor | $(hostname) | $(get_timestamp)\"
                 }
             }]
         }" \
         "$DISCORD_WEBHOOK" &>/dev/null || echo "Failed to send Discord notification"
}

# Get system stats
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}'
}

get_memory_usage() {
    free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}'
}

get_disk_usage() {
    df -h / | awk 'NR==2 {print $5}' | sed 's/%//'
}

# Get PM2 process info
get_pm2_info() {
    pm2 jlist 2>/dev/null | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | \"\(.pm2_env.status)|\(.pid)|\(.monit.memory / 1024 / 1024 | floor)|\(.monit.cpu)|\(.pm2_env.restart_time)\""
}

# Check if process needs restart due to high resource usage
check_process_health() {
    local pm2_info=$(get_pm2_info)
    if [ -n "$pm2_info" ]; then
        IFS='|' read -r status pid memory cpu restart_count <<< "$pm2_info"
        
        # Check if memory usage is too high (> 800MB)
        if [ "$memory" -gt 800 ]; then
            log_message "High memory usage detected: ${memory}MB"
            send_discord_notification \
                "🔄 High Memory Usage - Restarting Application" \
                "Application memory usage is too high and will be restarted." \
                "$COLOR_YELLOW" \
                "{\"name\": \"Memory Usage\", \"value\": \"${memory}MB\", \"inline\": true}, {\"name\": \"Action\", \"value\": \"Restarting PM2 process\", \"inline\": true}"
            
            pm2 restart "$PM2_APP_NAME"
            sleep 5
            
            send_discord_notification \
                "✅ Application Restarted" \
                "Application has been restarted due to high memory usage." \
                "$COLOR_GREEN" \
                "{\"name\": \"Status\", \"value\": \"Restarted\", \"inline\": true}, {\"name\": \"Previous Memory\", \"value\": \"${memory}MB\", \"inline\": true}"
        fi
        
        # Check if CPU usage is too high
        if (( $(echo "$cpu > 90" | bc -l) )); then
            log_message "High CPU usage detected: ${cpu}%"
            send_discord_notification \
                "⚠️ High CPU Usage Alert" \
                "Application CPU usage is critically high." \
                "$COLOR_RED" \
                "{\"name\": \"CPU Usage\", \"value\": \"${cpu}%\", \"inline\": true}, {\"name\": \"Memory\", \"value\": \"${memory}MB\", \"inline\": true}"
        fi
    fi
}

# Main monitoring function
main_monitor() {
    # Get system metrics
    CPU_USAGE=$(get_cpu_usage)
    MEMORY_USAGE=$(get_memory_usage)
    DISK_USAGE=$(get_disk_usage)
    
    # Get PM2 info
    PM2_INFO=$(get_pm2_info)
    
    log_message "System Check - CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%"
    
    # Check system thresholds
    ALERT_NEEDED=false
    ALERT_FIELDS=""
    
    # CPU Check
    if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
        ALERT_NEEDED=true
        ALERT_FIELDS="$ALERT_FIELDS{\"name\": \"⚠️ CPU Usage\", \"value\": \"${CPU_USAGE}% (Threshold: ${CPU_THRESHOLD}%)\", \"inline\": true},"
        log_message "CPU usage alert: ${CPU_USAGE}%"
    fi
    
    # Memory Check
    if (( $(echo "$MEMORY_USAGE > $MEMORY_THRESHOLD" | bc -l) )); then
        ALERT_NEEDED=true
        ALERT_FIELDS="$ALERT_FIELDS{\"name\": \"⚠️ Memory Usage\", \"value\": \"${MEMORY_USAGE}% (Threshold: ${MEMORY_THRESHOLD}%)\", \"inline\": true},"
        log_message "Memory usage alert: ${MEMORY_USAGE}%"
    fi
    
    # Disk Check
    if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
        ALERT_NEEDED=true
        ALERT_FIELDS="$ALERT_FIELDS{\"name\": \"⚠️ Disk Usage\", \"value\": \"${DISK_USAGE}% (Threshold: ${DISK_THRESHOLD}%)\", \"inline\": true},"
        log_message "Disk usage alert: ${DISK_USAGE}%"
    fi
    
    # PM2 Process Check
    if [ -n "$PM2_INFO" ]; then
        IFS='|' read -r status pid memory cpu restart_count <<< "$PM2_INFO"
        if [ "$status" != "online" ]; then
            ALERT_NEEDED=true
            ALERT_FIELDS="$ALERT_FIELDS{\"name\": \"❌ Application Status\", \"value\": \"$status (Expected: online)\", \"inline\": true},"
            log_message "Application status alert: $status"
        fi
    else
        ALERT_NEEDED=true
        ALERT_FIELDS="$ALERT_FIELDS{\"name\": \"❌ PM2 Process\", \"value\": \"Application not found\", \"inline\": true},"
        log_message "PM2 process not found"
    fi
    
    # Send alert if needed
    if [ "$ALERT_NEEDED" = true ]; then
        # Remove trailing comma
        ALERT_FIELDS=${ALERT_FIELDS%,}
        
        send_discord_notification \
            "System Resource Alert" \
            "One or more system resources are exceeding thresholds." \
            "$COLOR_RED" \
            "$ALERT_FIELDS"
    fi
    
    # Check process health and restart if needed
    check_process_health
}

# Health check mode - sends status update
health_check() {
    CPU_USAGE=$(get_cpu_usage)
    MEMORY_USAGE=$(get_memory_usage)
    DISK_USAGE=$(get_disk_usage)
    PM2_INFO=$(get_pm2_info)
    
    if [ -n "$PM2_INFO" ]; then
        IFS='|' read -r status pid memory cpu restart_count <<< "$PM2_INFO"
        
        send_discord_notification \
            "📊 System Health Check" \
            "Regular system status update" \
            "$COLOR_BLUE" \
            "{\"name\": \"🖥️ CPU Usage\", \"value\": \"${CPU_USAGE}%\", \"inline\": true}, {\"name\": \"💾 Memory Usage\", \"value\": \"${MEMORY_USAGE}%\", \"inline\": true}, {\"name\": \"💿 Disk Usage\", \"value\": \"${DISK_USAGE}%\", \"inline\": true}, {\"name\": \"🚀 App Status\", \"value\": \"$status\", \"inline\": true}, {\"name\": \"🧠 App Memory\", \"value\": \"${memory}MB\", \"inline\": true}, {\"name\": \"⚡ App CPU\", \"value\": \"${cpu}%\", \"inline\": true}"
    fi
}

# Startup notification
startup_notification() {
    send_discord_notification \
        "🚀 System Monitor Started" \
        "System monitoring has been initialized and is now active." \
        "$COLOR_GREEN" \
        "{\"name\": \"Server\", \"value\": \"$(hostname)\", \"inline\": true}, {\"name\": \"Monitor Script\", \"value\": \"Active\", \"inline\": true}, {\"name\": \"Application\", \"value\": \"$PM2_APP_NAME\", \"inline\": true}"
}

# Main execution
case "${1:-monitor}" in
    "monitor")
        main_monitor
        ;;
    "health")
        health_check
        ;;
    "startup")
        startup_notification
        ;;
    *)
        echo "Usage: $0 {monitor|health|startup}"
        exit 1
        ;;
esac
