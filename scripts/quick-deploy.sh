#!/bin/bash

# Quick deploy script with debugging
# Use this for manual deployment testing

set -e

# Configuration
PROJECT_DIR="$(pwd)"
SCRIPT_DIR="$PROJECT_DIR/scripts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
  echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

# Function to show current PM2 status
show_status() {
  log "📊 Current PM2 status:"
  pm2 status 2>/dev/null || echo "PM2 not running or error"
  echo ""
}

# Function to show logs
show_logs() {
  log "📋 Recent logs (last 10 lines):"
  pm2 logs --lines 10 2>/dev/null || echo "No logs available"
  echo ""
}

main() {
  log "🚀 Quick Deploy Script"
  log "📁 Project: $PROJECT_DIR"
  echo ""
  
  # Show current status before deployment
  log "=== BEFORE DEPLOYMENT ==="
  show_status
  
  # Run the webhook deploy script with verbose output
  log "🔄 Running deployment..."
  if [[ -f "$SCRIPT_DIR/webhook-deploy.sh" ]]; then
    bash -x "$SCRIPT_DIR/webhook-deploy.sh" 2>&1 | tee deploy.log
    exit_code=${PIPESTATUS[0]}
  else
    echo -e "${RED}Error: webhook-deploy.sh not found${NC}"
    exit 1
  fi
  
  echo ""
  log "=== AFTER DEPLOYMENT ==="
  show_status
  
  if [[ $exit_code -eq 0 ]]; then
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    show_logs
  else
    echo -e "${RED}❌ Deployment failed with exit code: $exit_code${NC}"
    show_logs
    echo ""
    log "📄 Deploy log saved to: deploy.log"
    echo "Use 'tail -f deploy.log' to see full output"
  fi
  
  exit $exit_code
}

# Handle interruption
trap 'echo -e "\n${YELLOW}Deployment interrupted${NC}"; show_status; exit 130' SIGINT SIGTERM

# Run main function
main "$@"
