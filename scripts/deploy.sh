#!/bin/bash
# Universal Deployment Script for Ticket Backend
# Supports multiple deployment modes and environments

DISCORD_WEBHOOK="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/var/www/backend/ticket-backend"
PM2_APP_NAME="ticket-backend-prod"
BRANCH="feature/newfunction"

# Functions
notify() {
  echo -e "${BLUE}[NOTIFY]${NC} $1"
  curl -H "Content-Type: application/json" -X POST -d "{"content": "$1"}" "$DISCORD_WEBHOOK" --silent 2>/dev/null || true
}

log() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error_exit() {
  echo -e "${RED}[ERROR]${NC} $1"
  notify "❌ [Ticket Backend] $1"
  exit 1
}

show_usage() {
  echo "🚀 Universal Deployment Script"
  echo ""
  echo "Usage: $0 [MODE] [OPTIONS]"
  echo ""
  echo "Modes:"
  echo "  quick         Quick deployment (git pull + restart)"
  echo "  full          Full deployment with backup"
  echo "  vps           VPS server setup"
  echo "  local         Local build and start"
  echo "  monitoring    Setup monitoring system only"
  echo "  monitor-status Check monitoring system status"
  echo ""
  echo "Options:"
  echo "  --no-backup   Skip backup creation"
  echo "  --no-notify   Skip Discord notifications"
  echo "  --branch=X    Use specific branch (default: feature/newfunction)"
  echo ""
  echo "Examples:"
  echo "  $0 quick                    # Quick deployment"
  echo "  $0 full                     # Full deployment with monitoring check"
  echo "  $0 local                    # Local development"
  echo "  $0 vps                      # VPS setup with monitoring"
  echo "  sudo $0 monitoring          # Setup monitoring system only"
  echo "  $0 monitor-status           # Check monitoring status"
}

# Quick deployment
quick_deploy() {
  log "🚀 Starting quick deployment..."
  notify "🚀 [Ticket Backend] Quick deployment started..."

  cd "$PROJECT_DIR" || error_exit "Failed to cd to project folder"
  
  git pull origin "$BRANCH" || error_exit "git pull failed"
  npm install || error_exit "npm install failed"
  npm run build || error_exit "Build failed"
  
  # Restart safely
  pm2 stop "$PM2_APP_NAME" 2>/dev/null || log "No running process to stop"
  pm2 start ecosystem.config.js --env production || error_exit "PM2 start failed"

  COMMIT=$(git log -1 --pretty=format:"%h - %s")
  notify "✅ [Ticket Backend] Quick deploy successful: $COMMIT"
  log "✅ Quick deployment completed!"
}

# Full deployment with backup
full_deploy() {
  log "🚀 Starting full deployment with backup..."
  notify "🚀 [Ticket Backend] Full deployment started..."

  # Create backup
  if [[ "$NO_BACKUP" != "true" ]]; then
    log "💾 Creating backup..."
    BACKUP_DIR="/var/backups/ticket-backend"
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null || log "Backup creation failed (non-critical)"
  fi

  cd "$PROJECT_DIR" || error_exit "Failed to cd to project folder"
  
  # Stop application completely
  log "⏹️ Stopping existing application..."
  pm2 stop "$PM2_APP_NAME" 2>/dev/null || log "No running process to stop"
  pm2 delete "$PM2_APP_NAME" 2>/dev/null || log "No existing process to delete"
  
  # Update code
  git stash push -m "Auto-stash before deployment $(date)" 2>/dev/null || true
  git fetch origin || error_exit "git fetch failed"
  git checkout "$BRANCH" || error_exit "git checkout failed"
  git pull origin "$BRANCH" || error_exit "git pull failed"
  
  # Install and build
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install || error_exit "npm install failed"
  npm run build || error_exit "Build failed"
  
  # Start application
  pm2 start ecosystem.config.js --env production || error_exit "PM2 start failed"
  pm2 save || log "PM2 save failed"
  
  # Health check
  sleep 10
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health || echo "000")
  if [ "$response" != "200" ]; then
    error_exit "Health check failed (HTTP $response)"
  fi

  COMMIT=$(git log -1 --pretty=format:"%h - %s")
  notify "✅ [Ticket Backend] Full deployment successful: $COMMIT"
  log "✅ Full deployment completed!"
}

# Local development build and start
local_deploy() {
  log "🚀 Starting local build and start..."
  
  # Change to script directory, then to project root
  cd "$(dirname "$0")/.." || error_exit "Failed to change to project directory"
  
  log "🧹 Cleaning previous build..."
  npm run clean || error_exit "Clean failed"
  
  log "📦 Installing dependencies..."
  npm install || error_exit "npm install failed"
  
  log "🛠️ Building project..."
  npm run build || error_exit "Build failed"
  
  # Check if PM2 is installed
  if ! command -v pm2 &> /dev/null; then
    log "📥 Installing PM2..."
    npm install -g pm2 || error_exit "PM2 installation failed"
  fi
  
  # Stop existing process
  pm2 stop "$PM2_APP_NAME" 2>/dev/null || log "No existing process to stop"
  pm2 delete "$PM2_APP_NAME" 2>/dev/null || log "No existing process to delete"
  
  log "▶️ Starting application with PM2..."
  pm2 start ecosystem.config.js --env production || error_exit "PM2 start failed"
  pm2 save || log "PM2 save failed"
  
  # Health check
  sleep 5
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health || echo "000")
  if [ "$response" = "200" ]; then
    log "✅ Health check passed"
  else
    log "⚠️ Health check warning (HTTP $response)"
  fi
  
  log "✅ Local deployment completed!"
  log "🌐 Application: http://localhost:4000"
  log "📚 API Docs: http://localhost:4000/api/docs"
}

# VPS server setup
vps_setup() {
  log "🖥️ Starting VPS server setup..."
  
  # Update system
  apt update && apt upgrade -y || error_exit "System update failed"
  
  # Install Node.js
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash - || error_exit "Node.js setup failed"
  apt-get install -y nodejs || error_exit "Node.js installation failed"
  
  # Install PostgreSQL
  apt install postgresql postgresql-contrib -y || error_exit "PostgreSQL installation failed"
  systemctl start postgresql
  systemctl enable postgresql
  
  # Install Redis
  apt install redis-server -y || error_exit "Redis installation failed"
  systemctl start redis-server
  systemctl enable redis-server
  
  # Install PM2
  npm install -g pm2 || error_exit "PM2 installation failed"
  
  # Install monitoring dependencies
  apt install -y jq curl htop || log "Failed to install monitoring dependencies"
  
  # Create application directory
  mkdir -p "$PROJECT_DIR"
  chown -R $USER:$USER "$PROJECT_DIR"
  
  # Setup monitoring scripts
  setup_monitoring_system
  
  # Setup database
  sudo -u postgres psql -c "CREATE USER boxing_user WITH PASSWORD 'Password123!';" 2>/dev/null || log "User already exists"
  sudo -u postgres psql -c "CREATE DATABASE boxing_ticket_db OWNER boxing_user;" 2>/dev/null || log "Database already exists"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE boxing_ticket_db TO boxing_user;" || log "Grant privileges failed"
  
  log "✅ VPS setup completed!"
  log "📝 Next steps:"
  log "1. Clone repository to $PROJECT_DIR"
  log "2. Configure environment files"
  log "3. Run full deployment"
}

# Parse arguments
MODE="$1"
NO_BACKUP="false"
NO_NOTIFY="false"

for arg in "$@"; do
  case $arg in
    --no-backup)
      NO_BACKUP="true"
      shift
      ;;
    --no-notify)
      NO_NOTIFY="true"
      shift
      ;;
    --branch=*)
      BRANCH="${arg#*=}"
      shift
      ;;
  esac
done

# Main execution
# Setup monitoring system
setup_monitoring_system() {
  log "🔧 Setting up monitoring system..."
  
  # Make scripts executable
  chmod +x "$PROJECT_DIR/scripts/monitor.sh"
  chmod +x "$PROJECT_DIR/scripts/auto-restart.sh"
  
  # Copy systemd service files
  cp "$PROJECT_DIR/scripts/ticket-monitor.service" /etc/systemd/system/
  cp "$PROJECT_DIR/scripts/ticket-auto-restart.service" /etc/systemd/system/
  
  # Reload systemd and enable services
  systemctl daemon-reload
  systemctl enable ticket-monitor.service
  systemctl enable ticket-auto-restart.service
  
  # Start services
  systemctl start ticket-monitor.service
  systemctl start ticket-auto-restart.service
  
  log "✅ Monitoring system installed and started"
  notify "📊 [Monitoring System] Resource monitoring and auto-restart services are now active"
}

# Check monitoring system status
check_monitoring_status() {
  log "📊 Checking monitoring system status..."
  
  if systemctl is-active --quiet ticket-monitor.service; then
    log "✅ Resource monitor service is running"
  else
    log "❌ Resource monitor service is not running"
  fi
  
  if systemctl is-active --quiet ticket-auto-restart.service; then
    log "✅ Auto-restart service is running"
  else
    log "❌ Auto-restart service is not running"
  fi
}

# Main execution
case "$MODE" in
  quick)
    quick_deploy
    ;;
  full)
    full_deploy
    check_monitoring_status
    ;;
  local)
    local_deploy
    ;;
  vps)
    if [ "$EUID" -ne 0 ]; then 
      error_exit "VPS setup requires root privileges. Run with sudo."
    fi
    vps_setup
    ;;
  monitoring)
    if [ "$EUID" -ne 0 ]; then 
      error_exit "Monitoring setup requires root privileges. Run with sudo."
    fi
    setup_monitoring_system
    ;;
  monitor-status)
    check_monitoring_status
    ;;
  *)
    show_usage
    exit 1
    ;;
esac
