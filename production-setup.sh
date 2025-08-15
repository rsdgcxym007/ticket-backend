#!/bin/bash

# 🎯 Production Setup Helper
# เลือกวิธีการติดตั้งที่เหมาะสม

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🎯 Patong Boxing Stadium - Production Setup${NC}"
echo -e "${CYAN}============================================${NC}"

# Detect environment
if [[ "$OSTYPE" == "darwin"* ]]; then
    ENVIRONMENT="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [[ -f "/etc/os-release" ]]; then
        . /etc/os-release
        ENVIRONMENT="Linux ($NAME)"
    else
        ENVIRONMENT="Linux"
    fi
else
    ENVIRONMENT="Unknown"
fi

echo -e "🖥️  Current Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "📁 Current Directory: ${YELLOW}$(pwd)${NC}"
echo ""

# Check current environment and suggest appropriate action
if [[ "$OSTYPE" == "darwin"* ]] || [[ ! -d "/var/www" ]]; then
    echo -e "${YELLOW}⚠️  You're running on a local machine (not a Linux server)${NC}"
    echo ""
    echo -e "${BLUE}Choose your deployment option:${NC}"
    echo ""
    echo -e "${GREEN}1. Deploy from Local to Remote Server${NC}"
    echo -e "   This will package your code and deploy it to your VPS"
    echo -e "   Command: ${CYAN}npm run production:deploy${NC}"
    echo ""
    echo -e "${GREEN}2. Setup Instructions for VPS${NC}"
    echo -e "   Get commands to run on your VPS server"
    echo ""
    echo -e "${GREEN}3. Test Locally First${NC}"
    echo -e "   Start development server to test before deploying"
    echo -e "   Command: ${CYAN}npm run start:dev${NC}"
    echo ""
    
    read -p "Choose option (1/2/3) or press Enter to cancel: " choice
    
    case $choice in
        1)
            echo -e "${BLUE}🚀 Starting deployment from local to remote server...${NC}"
            if [[ -f "./deploy-from-local.sh" ]]; then
                ./deploy-from-local.sh
            else
                echo -e "${RED}❌ deploy-from-local.sh not found${NC}"
                exit 1
            fi
            ;;
        2)
            echo -e "${BLUE}📋 VPS Setup Instructions:${NC}"
            echo -e "${CYAN}============================================${NC}"
            echo ""
            echo -e "${YELLOW}On your VPS server (43.229.133.51), run these commands:${NC}"
            echo ""
            echo -e "${GREEN}# 1. Login to your VPS${NC}"
            echo -e "ssh root@43.229.133.51"
            echo ""
            echo -e "${GREEN}# 2. Create project directory${NC}"
            echo -e "mkdir -p /var/www/api-patongboxingstadiumticket.com"
            echo -e "cd /var/www/api-patongboxingstadiumticket.com"
            echo ""
            echo -e "${GREEN}# 3. Clone your project${NC}"
            echo -e "git clone https://github.com/rsdgcxym007/ticket-backend.git ."
            echo ""
            echo -e "${GREEN}# 4. Run the complete setup${NC}"
            echo -e "chmod +x deploy-complete.sh"
            echo -e "./deploy-complete.sh"
            echo ""
            echo -e "${YELLOW}Or use the deploy-from-local script to deploy automatically${NC}"
            ;;
        3)
            echo -e "${BLUE}🧪 Starting local development server...${NC}"
            npm run start:dev
            ;;
        *)
            echo -e "${YELLOW}Operation cancelled${NC}"
            exit 0
            ;;
    esac
    
else
    # We're on a Linux server
    echo -e "${GREEN}✅ Detected Linux server environment${NC}"
    echo -e "${BLUE}🚀 Running complete production setup...${NC}"
    echo ""
    
    # Check if we have the required files
    if [[ ! -f "./deploy-complete.sh" ]]; then
        echo -e "${RED}❌ deploy-complete.sh not found in current directory${NC}"
        echo -e "${YELLOW}Make sure you're in the project root directory${NC}"
        exit 1
    fi
    
    # Run the deployment script
    chmod +x ./deploy-complete.sh
    ./deploy-complete.sh
fi
