#!/bin/bash

# Comprehensive Monitoring Script for Ticket Backend
# Provides real-time monitoring and log viewing capabilities

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
  echo ""
  echo "Examples:"
  echo "  $0 dashboard              # Show monitoring dashboard"
  echo "  $0 logs                   # Show recent logs"
  echo "  $0 watch                  # Watch logs real-time"
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
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health || echo "000")
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
  netstat -tuln | grep :4001 || echo "No connections on port 4001"
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
    "http://localhost:4001/health"
    "http://localhost:4001/api/docs"
    "http://localhost:4001/webhook/test"
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
  *)
    show_usage
    exit 1
    ;;
esac
