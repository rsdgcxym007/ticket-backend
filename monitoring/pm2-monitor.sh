#!/bin/bash

# PM2 Process Monitor
# Monitors PM2 processes and automatically restarts if needed

# Configuration
PM2_APP_NAME="ticket-backend-prod"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
LOG_FILE="/var/log/pm2-monitor.log"
MAX_RESTART_ATTEMPTS=3
RESTART_DELAY=10

# Colors
COLOR_GREEN=5763719
COLOR_YELLOW=16776960
COLOR_RED=15158332

# Get timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Logging
log_message() {
    echo "[$(get_timestamp)] $1" | tee -a "$LOG_FILE"
}

# Discord notification
send_notification() {
    local title="$1"
    local description="$2"
    local color="$3"
    local fields="${4:-}"
    
    curl -H "Content-Type: application/json" \
         -X POST \
         --max-time 10 \
         -d "{
             \"embeds\": [{
                 \"title\": \"🔧 $title\",
                 \"description\": \"$description\",
                 \"color\": $color,
                 \"fields\": [$fields],
                 \"footer\": {
                     \"text\": \"PM2 Monitor | $(hostname) | $(get_timestamp)\"
                 }
             }]
         }" \
         "$DISCORD_WEBHOOK" &>/dev/null || log_message "Failed to send Discord notification"
}

# Get PM2 process info
get_pm2_info() {
    pm2 jlist 2>/dev/null | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | \"\(.pm2_env.status)|\(.pid)|\(.monit.memory / 1024 / 1024 | floor)|\(.monit.cpu)|\(.pm2_env.restart_time)|\(.pm2_env.unstable_restarts)\""
}

# Check and restart process if needed
check_and_restart() {
    local pm2_info=$(get_pm2_info)
    
    if [ -z "$pm2_info" ]; then
        log_message "ERROR: PM2 process '$PM2_APP_NAME' not found"
        
        send_notification \
            "Process Not Found" \
            "PM2 process was not found and will be restarted." \
            "$COLOR_RED" \
            "{\"name\": \"Action\", \"value\": \"Starting process\", \"inline\": true}"
        
        # Try to start the process
        cd /var/www/backend/ticket-backend
        if pm2 start ecosystem.config.js --env production; then
            log_message "Successfully started PM2 process"
            send_notification \
                "Process Started" \
                "PM2 process has been successfully started." \
                "$COLOR_GREEN" \
                "{\"name\": \"Status\", \"value\": \"Started\", \"inline\": true}"
        else
            log_message "ERROR: Failed to start PM2 process"
            send_notification \
                "Failed to Start Process" \
                "Critical error: Unable to start PM2 process." \
                "$COLOR_RED" \
                "{\"name\": \"Status\", \"value\": \"Failed\", \"inline\": true}"
        fi
        return
    fi
    
    IFS='|' read -r status pid memory cpu restart_count unstable_restarts <<< "$pm2_info"
    
    log_message "Process status: $status, PID: $pid, Memory: ${memory}MB, CPU: ${cpu}%, Restarts: $restart_count"
    
    # Check if process is not online
    if [ "$status" != "online" ]; then
        log_message "WARNING: Process status is '$status', attempting restart..."
        
        send_notification \
            "Process Not Online" \
            "Process status is '$status' and will be restarted." \
            "$COLOR_YELLOW" \
            "{\"name\": \"Status\", \"value\": \"$status\", \"inline\": true}, {\"name\": \"PID\", \"value\": \"$pid\", \"inline\": true}, {\"name\": \"Action\", \"value\": \"Restarting\", \"inline\": true}"
        
        # Restart process
        if pm2 restart "$PM2_APP_NAME"; then
            sleep "$RESTART_DELAY"
            
            # Check if restart was successful
            local new_info=$(get_pm2_info)
            if [ -n "$new_info" ]; then
                IFS='|' read -r new_status new_pid new_memory new_cpu new_restart_count new_unstable <<< "$new_info"
                
                if [ "$new_status" = "online" ]; then
                    log_message "Successfully restarted process (new PID: $new_pid)"
                    send_notification \
                        "Process Restarted Successfully" \
                        "Process has been successfully restarted and is now online." \
                        "$COLOR_GREEN" \
                        "{\"name\": \"New Status\", \"value\": \"$new_status\", \"inline\": true}, {\"name\": \"New PID\", \"value\": \"$new_pid\", \"inline\": true}, {\"name\": \"Memory\", \"value\": \"${new_memory}MB\", \"inline\": true}"
                else
                    log_message "ERROR: Process restart failed, status: $new_status"
                    send_notification \
                        "Restart Failed" \
                        "Process restart failed, status is still '$new_status'." \
                        "$COLOR_RED" \
                        "{\"name\": \"Status\", \"value\": \"$new_status\", \"inline\": true}"
                fi
            fi
        else
            log_message "ERROR: PM2 restart command failed"
            send_notification \
                "Restart Command Failed" \
                "PM2 restart command failed to execute." \
                "$COLOR_RED" \
                "{\"name\": \"Error\", \"value\": \"Command failed\", \"inline\": true}"
        fi
    fi
    
    # Check for excessive memory usage
    if [ "$memory" -gt 900 ]; then
        log_message "WARNING: High memory usage detected: ${memory}MB"
        send_notification \
            "High Memory Usage" \
            "Process is using excessive memory and will be restarted." \
            "$COLOR_YELLOW" \
            "{\"name\": \"Memory Usage\", \"value\": \"${memory}MB\", \"inline\": true}, {\"name\": \"Threshold\", \"value\": \"900MB\", \"inline\": true}, {\"name\": \"Action\", \"value\": \"Restarting\", \"inline\": true}"
        
        pm2 restart "$PM2_APP_NAME"
        sleep "$RESTART_DELAY"
    fi
    
    # Check for too many unstable restarts
    if [ "$unstable_restarts" -gt 5 ]; then
        log_message "WARNING: Too many unstable restarts: $unstable_restarts"
        send_notification \
            "Unstable Process Detected" \
            "Process has too many unstable restarts, manual intervention may be needed." \
            "$COLOR_RED" \
            "{\"name\": \"Unstable Restarts\", \"value\": \"$unstable_restarts\", \"inline\": true}, {\"name\": \"Threshold\", \"value\": \"5\", \"inline\": true}"
    fi
}

# Main monitoring function
monitor() {
    log_message "Starting PM2 process monitoring..."
    check_and_restart
}

# Status report
status_report() {
    local pm2_info=$(get_pm2_info)
    
    if [ -n "$pm2_info" ]; then
        IFS='|' read -r status pid memory cpu restart_count unstable_restarts <<< "$pm2_info"
        
        send_notification \
            "PM2 Status Report" \
            "Current status of the PM2 process." \
            "$COLOR_GREEN" \
            "{\"name\": \"Status\", \"value\": \"$status\", \"inline\": true}, {\"name\": \"PID\", \"value\": \"$pid\", \"inline\": true}, {\"name\": \"Memory\", \"value\": \"${memory}MB\", \"inline\": true}, {\"name\": \"CPU\", \"value\": \"${cpu}%\", \"inline\": true}, {\"name\": \"Total Restarts\", \"value\": \"$restart_count\", \"inline\": true}, {\"name\": \"Unstable Restarts\", \"value\": \"$unstable_restarts\", \"inline\": true}"
    else
        send_notification \
            "PM2 Status Report" \
            "Process not found or not running." \
            "$COLOR_RED" \
            "{\"name\": \"Status\", \"value\": \"Not Found\", \"inline\": true}"
    fi
}

# Main execution
case "${1:-monitor}" in
    "monitor")
        monitor
        ;;
    "status")
        status_report
        ;;
    *)
        echo "Usage: $0 {monitor|status}"
        exit 1
        ;;
esac
