#!/bin/bash

# #!/bin/bash

# Universal Deployment Script for Ticket Backend
# Supports multiple deployment modes and environments

DISCORD_WEBHOOK="https://discord.com/api/webhooks/1401766190879215697/2YJq7JXqFqLBOCCWxTDi9tGe4AgzhNL4ctVeBi7Br5ejUzYAyAhm_4_TKnymqUDJY2c4"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/var/www/ticket-backend"
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
  echo ""
  echo "Options:"
  echo "  --no-backup   Skip backup creation"
  echo "  --no-notify   Skip Discord notifications"
  echo "  --branch=X    Use specific branch (default: feature/newfunction)"
  echo ""
  echo "Examples:"
  echo "  $0 quick                    # Quick deployment"
  echo "  $0 full                     # Full deployment"
  echo "  $0 local                    # Local development"
  echo "  $0 vps                      # VPS setup"
}

# Quick deployment
quick_deploy() {
  log "🚀 Starting quick deployment..."
  notify "🚀 [Ticket Backend] Quick deployment started..."

  cd "$PROJECT_DIR" || error_exit "Failed to cd to project folder"
  
  git pull origin "$BRANCH" || error_exit "git pull failed"
  npm install --production || error_exit "npm install failed"
  npm run build || error_exit "Build failed"
  pm2 restart "$PM2_APP_NAME" || error_exit "PM2 restart failed"

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
  
  # Stop application
  pm2 stop "$PM2_APP_NAME" 2>/dev/null || log "PM2 stop failed (process might not be running)"
  
  # Update code
  git stash push -m "Auto-stash before deployment $(date)" 2>/dev/null || true
  git fetch origin || error_exit "git fetch failed"
  git checkout "$BRANCH" || error_exit "git checkout failed"
  git pull origin "$BRANCH" || error_exit "git pull failed"
  
  # Install and build
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install --production || error_exit "npm install failed"
  npm run build || error_exit "Build failed"
  
  # Start application
  pm2 start ecosystem.config.js --env production || error_exit "PM2 start failed"
  pm2 save || log "PM2 save failed"
  
  # Health check
  sleep 10
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health || echo "000")
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
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health || echo "000")
  if [ "$response" = "200" ]; then
    log "✅ Health check passed"
  else
    log "⚠️ Health check warning (HTTP $response)"
  fi
  
  log "✅ Local deployment completed!"
  log "🌐 Application: http://localhost:4001"
  log "📚 API Docs: http://localhost:4001/api/docs"
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
  
  # Create application directory
  mkdir -p "$PROJECT_DIR"
  chown -R $USER:$USER "$PROJECT_DIR"
  
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
case "$MODE" in
  quick)
    quick_deploy
    ;;
  full)
    full_deploy
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
  *)
    show_usage
    exit 1
    ;;
esacployment Script for Ticket Backend System
# Server: 43.229.133.51
# Project: Ticket Backend System v5.3.0

# Discord Webhook for notifications
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1401766190879215697/2YJq7JXqFqLBOCCWxTDi9tGe4AgzhNL4ctVeBi7Br5ejUzYAyAhm_4_TKnymqUDJY2c4"

# Project configuration
PROJECT_DIR="/var/www/ticket-backend"
PM2_APP_NAME="ticket-backend-prod"
BRANCH="feature/newfunction"
BACKUP_DIR="/var/backups/ticket-backend"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to send Discord notifications
notify() {
  echo -e "${BLUE}[NOTIFY]${NC} $1"
  curl -H "Content-Type: application/json" \
       -X POST \
       -d "{\"content\": \"$1\"}" \
       "$DISCORD_WEBHOOK" \
       --silent --show-error
}

# Function to log with timestamp
log() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to handle errors
error_exit() {
  echo -e "${RED}[ERROR]${NC} $1"
  notify "❌ [Ticket Backend] $1"
  exit 1
}

# Function to create backup
create_backup() {
  log "Creating backup..."
  mkdir -p "$BACKUP_DIR"
  
  # Backup current deployment
  if [ -d "$PROJECT_DIR" ]; then
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME" || error_exit "Failed to create backup"
    log "Backup created: $BACKUP_DIR/$BACKUP_NAME"
  fi
  
  # Backup database
  PGPASSWORD="Password123!" pg_dump -h 43.229.133.51 -U boxing_user boxing_ticket_db > "$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql" || {
    log "Database backup failed (non-critical)"
  }
}

# Function to check prerequisites
check_prerequisites() {
  log "Checking prerequisites..."
  
  # Check if required commands exist
  command -v node >/dev/null 2>&1 || error_exit "Node.js is not installed"
  command -v npm >/dev/null 2>&1 || error_exit "npm is not installed"
  command -v pm2 >/dev/null 2>&1 || error_exit "PM2 is not installed"
  command -v git >/dev/null 2>&1 || error_exit "Git is not installed"
  
  # Check if services are running
  systemctl is-active --quiet postgresql || error_exit "PostgreSQL is not running"
  systemctl is-active --quiet redis-server || error_exit "Redis is not running"
  
  log "Prerequisites check passed"
}

# Function to test database connection
test_database() {
  log "Testing database connection..."
  PGPASSWORD="Password123!" psql -h 43.229.133.51 -U boxing_user -d boxing_ticket_db -c "SELECT 1;" >/dev/null 2>&1 || {
    error_exit "Database connection failed"
  }
  log "Database connection successful"
}

# Function to run health check
health_check() {
  log "Running health check..."
  sleep 10 # Wait for application to start
  
  # Check if application is responding
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health)
  if [ "$response" != "200" ]; then
    error_exit "Health check failed - Application not responding (HTTP $response)"
  fi
  
  log "Health check passed"
}

# Main deployment function
main() {
  log "🚀 Starting deployment for Ticket Backend System v5.3.0"
  notify "🚀 [Ticket Backend] Starting deployment on VPS (43.229.133.51)..."
  
  # Check prerequisites
  check_prerequisites
  
  # Test database connection
  test_database
  
  # Create backup
  create_backup
  
  # Navigate to project directory
  log "Navigating to project directory..."
  cd "$PROJECT_DIR" || error_exit "Failed to navigate to project directory: $PROJECT_DIR"
  
  # Stop PM2 process (gracefully)
  log "Stopping PM2 process..."
  notify "⏹️ [Ticket Backend] Stopping application..."
  pm2 stop "$PM2_APP_NAME" || log "PM2 stop failed (process might not be running)"
  
  # Pull latest changes
  log "Pulling latest changes from $BRANCH..."
  notify "📦 [Ticket Backend] Pulling latest changes from $BRANCH..."
  
  # Stash local changes if any
  git stash push -m "Auto-stash before deployment $(date)"
  
  # Fetch and pull
  git fetch origin || error_exit "git fetch failed"
  git checkout "$BRANCH" || error_exit "git checkout failed"
  git pull origin "$BRANCH" || error_exit "git pull failed"
  
  # Backup and restore environment file
  log "Managing environment configuration..."
  notify "🔐 [Ticket Backend] Managing environment configuration..."
  
  # Use production environment
  if [ -f ".env.production" ]; then
    cp .env.production .env || error_exit "Failed to copy production environment"
    log "Production environment configured"
  else
    error_exit ".env.production file not found"
  fi
  
  # Install dependencies
  log "Installing dependencies..."
  notify "📥 [Ticket Backend] Installing dependencies..."
  
  # Clear npm cache and node_modules for clean install
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install --production || error_exit "npm install failed"
  
  # Build project
  log "Building project..."
  notify "🛠️ [Ticket Backend] Building project..."
  npm run build || error_exit "Build failed"
  
  # Run database migrations if needed
  log "Running database migrations..."
  npm run migration:run || log "Migration failed or no migrations to run"
  
  # Start PM2 process
  log "Starting PM2 process..."
  notify "🔁 [Ticket Backend] Starting application..."
  pm2 start ecosystem.config.js --env production || error_exit "PM2 start failed"
  
  # Save PM2 configuration
  pm2 save || log "PM2 save failed"
  
  # Health check
  health_check
  
  # Get deployment information
  COMMIT=$(git log -1 --pretty=format:"%h - %s by %an")
  DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Success notification
  log "✅ Deployment completed successfully!"
  notify "✅ [Ticket Backend] Deployed successfully on VPS!"
  notify "📊 Commit: $COMMIT"
  notify "🕒 Deploy Time: $DEPLOY_TIME"
  notify "🌐 Application: http://43.229.133.51:4001"
  notify "📚 API Docs: http://43.229.133.51:4001/api/docs"
  
  # Show PM2 status
  log "Current PM2 status:"
  pm2 status
  
  # Show system resource usage
  log "System resource usage:"
  echo "Memory usage:"
  free -h
  echo "Disk usage:"
  df -h /var/www
  
  log "🎉 Deployment completed at $DEPLOY_TIME"
}

# Error handling
set -e
trap 'error_exit "Script failed at line $LINENO"' ERR

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
  error_exit "Please run this script as root or with sudo"
fi

# Run main deployment
main "$@"
