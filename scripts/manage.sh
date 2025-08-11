#!/bin/bash

# Application Management Script for Ticket Backend
# Combines PM2 management, status checking, and rollback functionality

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/var/www/ticket-backend"
PM2_APP_NAME="ticket-backend-prod"
BACKUP_DIR="/var/backups/ticket-backend"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1401766190879215697/2YJq7JXqFqLBOCCWxTDi9tGe4AgzhNL4ctVeBi7Br5ejUzYAyAhm_4_TKnymqUDJY2c4"

# Functions
notify() {
  curl -H "Content-Type: application/json" -X POST -d "{\"content\": \"$1\"}" "$DISCORD_WEBHOOK" --silent 2>/dev/null || true
}

log() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error_exit() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

show_usage() {
  echo "🎛️ Application Management Script"
  echo ""
  echo "Usage: $0 [COMMAND]"
  echo ""
  echo "Commands:"
  echo "  start         Start the application with PM2"
  echo "  stop          Stop the application"
  echo "  restart       Restart the application"
  echo "  status        Show application status"
  echo "  logs          Show application logs"
  echo "  rollback      Rollback to previous backup"
  echo "  list-backups  List available backups"
  echo "  monitor       Start PM2 monitoring"
  echo ""
  echo "Examples:"
  echo "  $0 status                   # Show status"
  echo "  $0 restart                  # Restart app"
  echo "  $0 rollback                 # Rollback"
}

# Start application
start_app() {
  log "▶️ Starting application..."
  
  cd "$PROJECT_DIR" || error_exit "Failed to change to project directory"
  
  # Check if PM2 is installed
  if ! command -v pm2 &> /dev/null; then
    log "📥 Installing PM2..."
    npm install -g pm2 || error_exit "PM2 installation failed"
  fi
  
  # Start with ecosystem file
  if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production || error_exit "Failed to start with ecosystem config"
  else
    pm2 start dist/main.js --name "$PM2_APP_NAME" || error_exit "Failed to start application"
  fi
  
  pm2 save || log "Failed to save PM2 configuration"
  log "✅ Application started successfully!"
}

# Stop application
stop_app() {
  log "⏹️ Stopping application..."
  pm2 stop "$PM2_APP_NAME" || error_exit "Failed to stop application"
  log "✅ Application stopped!"
}

# Restart application
restart_app() {
  log "🔄 Restarting application..."
  pm2 restart "$PM2_APP_NAME" || error_exit "Failed to restart application"
  
  # Health check
  sleep 5
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health || echo "000")
  if [ "$response" = "200" ]; then
    log "✅ Application restarted and health check passed!"
  else
    log "⚠️ Application restarted but health check failed (HTTP $response)"
  fi
}

# Show status
show_status() {
  echo -e "${BLUE}=== Application Status ===${NC}"
  pm2 show "$PM2_APP_NAME" 2>/dev/null || log "Application not found in PM2"
  
  echo -e "\n${BLUE}=== PM2 List ===${NC}"
  pm2 list
  
  echo -e "\n${BLUE}=== Health Check ===${NC}"
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health || echo "000")
  if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed (HTTP $response)${NC}"
  else
    echo -e "${RED}❌ Health check failed (HTTP $response)${NC}"
  fi
  
  echo -e "\n${BLUE}=== System Resources ===${NC}"
  echo "Memory Usage:"
  free -h
  echo -e "\nDisk Usage:"
  df -h "$PROJECT_DIR"
}

# Show logs
show_logs() {
  log "📄 Showing application logs..."
  pm2 logs "$PM2_APP_NAME" --lines 50
}

# List backups
list_backups() {
  echo -e "${BLUE}=== Available Backups ===${NC}"
  if [ -d "$BACKUP_DIR" ]; then
    ls -la "$BACKUP_DIR" | grep "backup-" | sort -r
  else
    log "No backup directory found: $BACKUP_DIR"
  fi
}

# Rollback to previous backup
rollback() {
  log "🔄 Starting rollback process..."
  notify "🔄 [Ticket Backend] Rollback started..."
  
  # List available backups
  echo -e "${YELLOW}Available backups:${NC}"
  if [ ! -d "$BACKUP_DIR" ]; then
    error_exit "No backup directory found: $BACKUP_DIR"
  fi
  
  backups=($(ls -1 "$BACKUP_DIR" | grep "backup-" | sort -r))
  if [ ${#backups[@]} -eq 0 ]; then
    error_exit "No backups found in $BACKUP_DIR"
  fi
  
  echo "Please select a backup to restore:"
  for i in "${!backups[@]}"; do
    echo "$((i+1)). ${backups[$i]}"
  done
  
  read -p "Enter backup number (1-${#backups[@]}): " choice
  
  if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#backups[@]} ]; then
    selected_backup="${backups[$((choice-1))]}"
    log "Selected backup: $selected_backup"
    
    # Stop application
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || log "Application not running"
    
    # Create backup of current state
    current_backup="backup-before-rollback-$(date +%Y%m%d-%H%M%S)"
    cp -r "$PROJECT_DIR" "$BACKUP_DIR/$current_backup" || log "Failed to backup current state"
    
    # Restore backup
    rm -rf "$PROJECT_DIR"
    cp -r "$BACKUP_DIR/$selected_backup" "$PROJECT_DIR" || error_exit "Failed to restore backup"
    
    # Start application
    cd "$PROJECT_DIR"
    pm2 start ecosystem.config.js --env production || error_exit "Failed to start after rollback"
    
    # Health check
    sleep 10
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health || echo "000")
    if [ "$response" != "200" ]; then
      error_exit "Health check failed after rollback (HTTP $response)"
    fi
    
    log "✅ Rollback completed successfully!"
    notify "✅ [Ticket Backend] Rollback to $selected_backup completed successfully!"
  else
    error_exit "Invalid selection"
  fi
}

# Start monitoring
start_monitor() {
  log "📊 Starting PM2 monitoring..."
  pm2 monit
}

# Main execution
case "$1" in
  start)
    start_app
    ;;
  stop)
    stop_app
    ;;
  restart)
    restart_app
    ;;
  status)
    show_status
    ;;
  logs)
    show_logs
    ;;
  rollback)
    rollback
    ;;
  list-backups)
    list_backups
    ;;
  monitor)
    start_monitor
    ;;
  *)
    show_usage
    exit 1
    ;;
esac
