#!/bin/bash

# Comprehensive Monitoring Script for Ticket Backend
# Provides real-time monitoring, alerting, and log viewing capabilities

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PM2_APP_NAME="ticket-backend-prod"
LOG_LINES=50
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"
CPU_THRESHOLD=50
MEMORY_THRESHOLD=50
DISK_THRESHOLD=80
ALERT_COOLDOWN=300  # 5 minutes cooldown between alerts
ALERT_FILE="/tmp/monitor_alerts"

# Create alert file if not exists
touch "$ALERT_FILE"

show_usage() {
  echo -e "${CYAN}📊 Ticket Backend Monitoring Tools${NC}"
  echo ""
  echo "Usage: $0 [COMMAND]"
  echo ""
  echo "Commands:"
  echo "  dashboard     Show real-time dashboard"
  echo "  logs          Show application logs"
  echo "  errors        Show error logs only"
  echo "  access        Show access logs"
  echo "  performance   Show performance metrics"
  echo "  deployment    Show deployment history"
  echo "  health        Health check and status"
  echo "  watch         Watch logs in real-time"
  echo "  alert         Start resource monitoring with alerts"
  echo "  test-alert    Send test alert to Discord"
  echo ""
  echo "Examples:"
  echo "  $0 dashboard              # Show monitoring dashboard"
  echo "  $0 logs                   # Show recent logs"
  echo "  $0 watch                  # Watch logs real-time"
  echo "  $0 alert                  # Start resource monitoring"
  echo "  $0 test-alert             # Test Discord notification"
}

# Get system information
get_cpu_usage() {
    if command -v top >/dev/null 2>&1; then
        # For Linux/Ubuntu
        top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' 2>/dev/null || \
        top -bn1 | grep "%Cpu" | awk '{print $2}' | sed 's/%us,//' 2>/dev/null || \
        # Alternative method
        top -bn1 | grep -i cpu | awk 'NR==1{print $2}' | sed 's/%us,//' 2>/dev/null || \
        # Using iostat if available
        iostat -c 1 1 | tail -1 | awk '{print 100-$6}' 2>/dev/null || \
        # Using sar if available
        sar 1 1 | tail -1 | awk '{print 100-$8}' 2>/dev/null || \
        # Fallback to vmstat
        vmstat 1 2 | tail -1 | awk '{print 100-$15}' 2>/dev/null || \
        echo "0"
    else
        echo "0"
    fi
}

get_memory_usage() {
    if command -v free >/dev/null 2>&1; then
        free | grep Mem | awk '{printf "%.1f", ($3/$2) * 100.0}'
    else
        # Fallback for systems without free command
        cat /proc/meminfo | awk '
        /MemTotal/ {total = $2}
        /MemAvailable/ {available = $2}
        END {
            used = total - available
            printf "%.1f", (used/total) * 100.0
        }' 2>/dev/null || echo "0"
    fi
}

get_disk_usage() {
    df / | tail -1 | awk '{print $5}' | sed 's/%//' 2>/dev/null || echo "0"
}

get_pm2_status() {
    if command -v pm2 >/dev/null 2>&1; then
        pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .pm2_env.status" 2>/dev/null || echo "unknown"
    else
        echo "pm2_not_installed"
    fi
}

get_pm2_memory() {
    if command -v pm2 >/dev/null 2>&1; then
        pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .monit.memory" 2>/dev/null | \
        awk '{printf "%.1f", $1/1024/1024}' || echo "0"
    else
        echo "0"
    fi
}

get_pm2_cpu() {
    if command -v pm2 >/dev/null 2>&1; then
        pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP_NAME\") | .monit.cpu" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Check if alert should be sent (cooldown mechanism)
should_alert() {
    local alert_type="$1"
    local current_time=$(date +%s)
    local last_alert=$(grep "^$alert_type:" "$ALERT_FILE" 2>/dev/null | cut -d: -f2)
    
    if [ -z "$last_alert" ]; then
        return 0
    fi
    
    local time_diff=$((current_time - last_alert))
    if [ $time_diff -gt $ALERT_COOLDOWN ]; then
        return 0
    else
        return 1
    fi
}

# Record alert time
record_alert() {
    local alert_type="$1"
    local current_time=$(date +%s)
    
    # Remove old alert record for this type
    grep -v "^$alert_type:" "$ALERT_FILE" > "${ALERT_FILE}.tmp" 2>/dev/null || true
    mv "${ALERT_FILE}.tmp" "$ALERT_FILE" 2>/dev/null || true
    
    # Add new alert record
    echo "$alert_type:$current_time" >> "$ALERT_FILE"
}

# Send Discord notification
send_alert() {
    local message="$1"
    local level="$2"
    
    case $level in
        "critical")
            emoji="🚨"
            color="15158332"  # Red
            ;;
        "warning")
            emoji="⚠️"
            color="16776960"  # Yellow
            ;;
        "info")
            emoji="ℹ️"
            color="3447003"   # Blue
            ;;
        *)
            emoji="📊"
            color="3447003"
            ;;
    esac
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    local hostname=$(hostname)
    
    # Create rich embed for Discord
    local payload=$(cat <<EOF
{
    "embeds": [
        {
            "title": "$emoji Server Monitor Alert",
            "description": "$message",
            "color": $color,
            "fields": [
                {
                    "name": "Server",
                    "value": "$hostname",
                    "inline": true
                },
                {
                    "name": "Time",
                    "value": "$timestamp",
                    "inline": true
                }
            ],
            "footer": {
                "text": "Ticket Backend Monitoring System"
            }
        }
    ]
}
EOF
)
    
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "$payload" \
         "$DISCORD_WEBHOOK" \
         --silent 2>/dev/null || true
}

# Resource monitoring function
monitor_resources() {
    local cpu_usage
    local memory_usage
    local disk_usage
    local pm2_status
    local pm2_memory
    local pm2_cpu
    
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Checking system resources..."
    
    # Get all metrics
    cpu_usage=$(get_cpu_usage)
    memory_usage=$(get_memory_usage)
    disk_usage=$(get_disk_usage)
    pm2_status=$(get_pm2_status)
    pm2_memory=$(get_pm2_memory)
    pm2_cpu=$(get_pm2_cpu)
    
    # Remove decimal points for comparison
    cpu_int=$(echo "$cpu_usage" | cut -d. -f1)
    memory_int=$(echo "$memory_usage" | cut -d. -f1)
    disk_int=$(echo "$disk_usage" | cut -d. -f1)
    
    # Display current status
    echo -e "${GREEN}System Resources:${NC}"
    echo -e "  CPU Usage: ${cpu_usage}%"
    echo -e "  Memory Usage: ${memory_usage}%"
    echo -e "  Disk Usage: ${disk_usage}%"
    echo -e "  PM2 App Status: ${pm2_status}"
    echo -e "  PM2 App Memory: ${pm2_memory} MB"
    echo -e "  PM2 App CPU: ${pm2_cpu}%"
    
    # Check thresholds and send alerts
    local alerts_sent=0
    
    # CPU Alert
    if [ "$cpu_int" -gt "$CPU_THRESHOLD" ]; then
        if should_alert "cpu"; then
            send_alert "🔥 **HIGH CPU USAGE DETECTED**\n\nCurrent CPU usage: **${cpu_usage}%**\nThreshold: ${CPU_THRESHOLD}%\n\nPM2 App CPU: ${pm2_cpu}%" "critical"
            record_alert "cpu"
            alerts_sent=1
            echo -e "${RED}ALERT: CPU usage is ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)${NC}"
        fi
    fi
    
    # Memory Alert
    if [ "$memory_int" -gt "$MEMORY_THRESHOLD" ]; then
        if should_alert "memory"; then
            send_alert "💾 **HIGH MEMORY USAGE DETECTED**\n\nCurrent Memory usage: **${memory_usage}%**\nThreshold: ${MEMORY_THRESHOLD}%\n\nPM2 App Memory: ${pm2_memory} MB" "critical"
            record_alert "memory"
            alerts_sent=1
            echo -e "${RED}ALERT: Memory usage is ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)${NC}"
        fi
    fi
    
    # Disk Alert
    if [ "$disk_int" -gt "$DISK_THRESHOLD" ]; then
        if should_alert "disk"; then
            send_alert "💿 **HIGH DISK USAGE DETECTED**\n\nCurrent Disk usage: **${disk_usage}%**\nThreshold: ${DISK_THRESHOLD}%" "warning"
            record_alert "disk"
            alerts_sent=1
            echo -e "${YELLOW}ALERT: Disk usage is ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)${NC}"
        fi
    fi
    
    # PM2 Status Alert
    if [ "$pm2_status" != "online" ]; then
        if should_alert "pm2_status"; then
            send_alert "🔴 **PM2 APPLICATION DOWN**\n\nApplication: ${PM2_APP_NAME}\nStatus: **${pm2_status}**\n\nPlease check the application immediately!" "critical"
            record_alert "pm2_status"
            alerts_sent=1
            echo -e "${RED}ALERT: PM2 app ${PM2_APP_NAME} is ${pm2_status}${NC}"
        fi
    fi
    
    if [ $alerts_sent -eq 0 ]; then
        echo -e "${GREEN}All systems operating within normal parameters${NC}"
    fi
}

# Start continuous monitoring
start_alert_monitoring() {
    echo -e "${BLUE}Starting continuous resource monitoring...${NC}"
    echo -e "${BLUE}Thresholds: CPU=${CPU_THRESHOLD}%, Memory=${MEMORY_THRESHOLD}%, Disk=${DISK_THRESHOLD}%${NC}"
    echo -e "${BLUE}Press Ctrl+C to stop${NC}"
    echo ""
    
    while true; do
        monitor_resources
        echo ""
        sleep 60  # Check every minute
    done
}

# Test alert function
test_alert() {
    echo "Sending test alert to Discord..."
    send_alert "🧪 **Test Alert**\n\nThis is a test notification from the monitoring system.\n\nIf you receive this message, the alert system is working correctly!" "info"
    echo "Test alert sent!"
}

show_dashboard() {
  clear
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║                    TICKET BACKEND DASHBOARD                  ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  # Application Status
  echo -e "${BLUE}🚀 Application Status:${NC}"
  pm2 show "$PM2_APP_NAME" 2>/dev/null | head -20
  echo ""
  
  # Health Check
  echo -e "${BLUE}🏥 Health Check:${NC}"
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health || echo "000")
  if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Application is healthy (HTTP $response)${NC}"
  else
    echo -e "${RED}❌ Application health check failed (HTTP $response)${NC}"
  fi
  echo ""
  
  # System Resources
  echo -e "${BLUE}💻 System Resources:${NC}"
  echo -e "${YELLOW}Memory Usage:${NC}"
  free -h | grep -E "(Mem|Swap)"
  echo ""
  echo -e "${YELLOW}CPU Usage:${NC}"
  top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1 "%"}'
  echo ""
  echo -e "${YELLOW}Disk Usage:${NC}"
  df -h /var/www | tail -1
  echo ""
  
  # Recent Logs
  echo -e "${BLUE}📄 Recent Logs (last 10 lines):${NC}"
  pm2 logs "$PM2_APP_NAME" --lines 10 --nostream 2>/dev/null || echo "No logs available"
}

show_logs() {
  echo -e "${BLUE}📄 Application Logs (last $LOG_LINES lines):${NC}"
  pm2 logs "$PM2_APP_NAME" --lines "$LOG_LINES" --nostream
}

show_errors() {
  echo -e "${RED}❌ Error Logs:${NC}"
  pm2 logs "$PM2_APP_NAME" --err --lines "$LOG_LINES" --nostream
}

show_access_logs() {
  echo -e "${GREEN}🌐 Access Logs:${NC}"
  if [ -f "/var/log/nginx/access.log" ]; then
    tail -n "$LOG_LINES" /var/log/nginx/access.log
  else
    echo "Nginx access logs not found. Showing application logs instead:"
    pm2 logs "$PM2_APP_NAME" --lines "$LOG_LINES" --nostream | grep -i "request\|response\|http"
  fi
}

show_performance() {
  echo -e "${YELLOW}⚡ Performance Metrics:${NC}"
  echo ""
  
  # PM2 Monitoring
  echo -e "${BLUE}PM2 Process Info:${NC}"
  pm2 monit --no-daemon 2>/dev/null &
  PID=$!
  sleep 3
  kill $PID 2>/dev/null
  
  # Memory usage by process
  echo -e "${BLUE}Memory Usage by Process:${NC}"
  ps aux | grep -E "(node|nest|ticket)" | grep -v grep | head -5
  
  # Network connections
  echo -e "${BLUE}Network Connections:${NC}"
  netstat -tuln | grep :4000 || echo "No connections on port 4000"
}

show_deployment_history() {
  echo -e "${BLUE}🚀 Deployment History:${NC}"
  echo ""
  
  # Git commit history
  echo -e "${YELLOW}Recent Commits:${NC}"
  cd /var/www/backend/ticket-backend 2>/dev/null && git log --oneline -10 || echo "Cannot access git repository"
  echo ""
  
  # PM2 restart history
  echo -e "${YELLOW}PM2 Restart History:${NC}"
  pm2 prettylist | grep -A 5 -B 5 "restart_time\|created_at" || echo "No PM2 history available"
  echo ""
  
  # Backup history
  echo -e "${YELLOW}Available Backups:${NC}"
  if [ -d "/var/backups/ticket-backend" ]; then
    ls -la /var/backups/ticket-backend/ | tail -10
  else
    echo "No backup directory found"
  fi
}

health_check() {
  echo -e "${GREEN}🏥 Comprehensive Health Check:${NC}"
  echo ""
  
  # Application endpoint
  echo -e "${BLUE}Testing Application Endpoints:${NC}"
  endpoints=(
    "http://localhost:4000/health"
    "http://localhost:4000/api/docs"
    "http://localhost:4000/webhook/test"
  )
  
  for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" || echo "000")
    if [ "$response" = "200" ]; then
      echo -e "✅ $endpoint - ${GREEN}OK ($response)${NC}"
    else
      echo -e "❌ $endpoint - ${RED}FAIL ($response)${NC}"
    fi
  done
  echo ""
  
  # Database connection
  echo -e "${BLUE}Database Connection:${NC}"
  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="Password123!" psql -h localhost -U boxing_user -d boxing_ticket_db -c "SELECT 1;" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo -e "✅ ${GREEN}Database connection OK${NC}"
    else
      echo -e "❌ ${RED}Database connection failed${NC}"
    fi
  else
    echo -e "⚠️ ${YELLOW}psql not installed, cannot test database${NC}"
  fi
  echo ""
  
  # Redis connection
  echo -e "${BLUE}Redis Connection:${NC}"
  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli ping >/dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo -e "✅ ${GREEN}Redis connection OK${NC}"
    else
      echo -e "❌ ${RED}Redis connection failed${NC}"
    fi
  else
    echo -e "⚠️ ${YELLOW}redis-cli not installed, cannot test Redis${NC}"
  fi
}

watch_logs() {
  echo -e "${CYAN}👁️ Watching logs in real-time (Press Ctrl+C to stop)${NC}"
  pm2 logs "$PM2_APP_NAME" --lines 0
}

# Main execution
case "$1" in
  dashboard)
    show_dashboard
    ;;
  logs)
    show_logs
    ;;
  errors)
    show_errors
    ;;
  access)
    show_access_logs
    ;;
  performance)
    show_performance
    ;;
  deployment)
    show_deployment_history
    ;;
  health)
    health_check
    ;;
  watch)
    watch_logs
    ;;
  alert)
    start_alert_monitoring
    ;;
  test-alert)
    test_alert
    ;;
  *)
    show_usage
    exit 1
    ;;
esac
