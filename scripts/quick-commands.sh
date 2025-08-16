#!/bin/bash

# Quick Commands for Patong Boxing Stadium Management
# คำสั่งที่ใช้บ่อยๆ สำหรับการจัดการระบบ
# Author: GitHub Copilot
# Date: 2025-08-16

# Configuration  
SERVER_IP="43.229.133.51"
DOMAIN="patongboxingstadiumticket.com"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
WHITE='\033[1;37m'
CYAN='\033[0;36m'
NC='\033[0m'

# Show menu
show_menu() {
    echo -e "${WHITE}
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║           🥊 PATONG BOXING STADIUM - QUICK MENU         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
${NC}"

    echo -e "${CYAN}DEPLOYMENT OPTIONS:${NC}"
    echo -e "${GREEN}  1)${NC} 🚀 Full Deploy (Clean → Install → Email → Monitor)"
    echo -e "${GREEN}  2)${NC} 📤 Upload from Local & Deploy"  
    echo -e "${GREEN}  3)${NC} 🧹 Clean Old Project Only"
    echo -e "${GREEN}  4)${NC} 🏗️  Install New System Only"
    echo -e "${GREEN}  5)${NC} 📧 Setup Email System Only"
    echo ""
    
    echo -e "${CYAN}MANAGEMENT OPTIONS:${NC}"
    echo -e "${GREEN}  6)${NC} 📊 Check System Status"
    echo -e "${GREEN}  7)${NC} 🔄 Restart All Services"
    echo -e "${GREEN}  8)${NC} 📋 View Logs"
    echo -e "${GREEN}  9)${NC} 🧪 Test System Health"
    echo -e "${GREEN} 10)${NC} 🔧 Update Environment Variables"
    echo ""
    
    echo -e "${CYAN}MONITORING OPTIONS:${NC}"
    echo -e "${GREEN} 11)${NC} 📈 Server Performance"
    echo -e "${GREEN} 12)${NC} 🔍 Check Processes"
    echo -e "${GREEN} 13)${NC} 🌐 Test URLs"
    echo -e "${GREEN} 14)${NC} 📧 Test Email System"
    echo ""
    
    echo -e "${CYAN}MAINTENANCE OPTIONS:${NC}"
    echo -e "${GREEN} 15)${NC} 💾 Backup System"
    echo -e "${GREEN} 16)${NC} 🔒 Update SSL Certificates"
    echo -e "${GREEN} 17)${NC} 🛡️  Check Security"
    echo -e "${GREEN} 18)${NC} 🔧 System Optimization"
    echo ""
    
    echo -e "${RED}  0)${NC} ❌ Exit"
    echo ""
}

# Execute command
execute_command() {
    local choice=$1
    
    case $choice in
        1)
            echo -e "${PURPLE}🚀 Running Full Deployment...${NC}"
            sudo ./master-deployment.sh
            ;;
        2)
            echo -e "${PURPLE}📤 Uploading from Local & Deploying...${NC}"
            ./upload-and-deploy.sh
            ;;
        3)
            echo -e "${PURPLE}🧹 Cleaning Old Project...${NC}"
            sudo ./complete-project-cleanup.sh
            ;;
        4) 
            echo -e "${PURPLE}🏗️ Installing New System...${NC}"
            sudo ./complete-deployment-setup.sh
            ;;
        5)
            echo -e "${PURPLE}📧 Setting up Email System...${NC}"
            sudo ./setup-email-complete.sh
            ;;
        6)
            echo -e "${PURPLE}📊 Checking System Status...${NC}"
            check_system_status
            ;;
        7)
            echo -e "${PURPLE}🔄 Restarting All Services...${NC}"
            restart_services
            ;;
        8)
            echo -e "${PURPLE}📋 Viewing Logs...${NC}"
            view_logs
            ;;
        9)
            echo -e "${PURPLE}🧪 Testing System Health...${NC}"
            test_health
            ;;
        10)
            echo -e "${PURPLE}🔧 Updating Environment Variables...${NC}"
            edit_env
            ;;
        11)
            echo -e "${PURPLE}📈 Checking Server Performance...${NC}"
            check_performance
            ;;
        12)
            echo -e "${PURPLE}🔍 Checking Processes...${NC}"
            check_processes
            ;;
        13)
            echo -e "${PURPLE}🌐 Testing URLs...${NC}"
            test_urls
            ;;
        14)
            echo -e "${PURPLE}📧 Testing Email System...${NC}"
            test_email
            ;;
        15)
            echo -e "${PURPLE}💾 Creating Backup...${NC}"
            create_backup
            ;;
        16)
            echo -e "${PURPLE}🔒 Updating SSL Certificates...${NC}"
            update_ssl
            ;;
        17)
            echo -e "${PURPLE}🛡️ Checking Security...${NC}"
            check_security
            ;;
        18)
            echo -e "${PURPLE}🔧 System Optimization...${NC}"
            optimize_system
            ;;
        0)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option. Please try again.${NC}"
            ;;
    esac
}

# Function implementations
check_system_status() {
    echo -e "${BLUE}📊 System Status Report${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check services
    echo -e "${CYAN}🔧 Services:${NC}"
    services=("nginx" "postgresql" "redis-server" "fail2ban" "webhook")
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            echo -e "  ✅ $service: ${GREEN}Running${NC}"
        else
            echo -e "  ❌ $service: ${RED}Stopped${NC}"
        fi
    done
    
    # Check PM2
    echo -e "${CYAN}🔄 PM2 Processes:${NC}"
    if command -v pm2 >/dev/null 2>&1 && id "nodeapp" &>/dev/null; then
        sudo -u nodeapp pm2 list
    else
        echo "  PM2 not available"
    fi
    
    # System resources
    echo -e "${CYAN}💻 System Resources:${NC}"
    echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')% used"
    echo "  Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
    echo "  Disk: $(df -h / | awk 'NR==2{print $3 "/" $2 " (" $5 " used)"}')"
}

restart_services() {
    echo -e "${BLUE}🔄 Restarting Services${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    services=("nginx" "postgresql" "redis-server" "fail2ban" "webhook")
    for service in "${services[@]}"; do
        echo "Restarting $service..."
        systemctl restart "$service" && echo -e "  ✅ $service restarted" || echo -e "  ❌ $service failed"
    done
    
    # Restart PM2
    if id "nodeapp" &>/dev/null; then
        echo "Restarting PM2 processes..."
        sudo -u nodeapp pm2 restart all && echo -e "  ✅ PM2 processes restarted"
    fi
}

view_logs() {
    echo -e "${BLUE}📋 Available Logs${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1) Deployment log"
    echo "2) PM2 application logs"
    echo "3) Nginx error log"
    echo "4) Nginx access log"
    echo "5) Webhook deploy log"
    echo "6) PostgreSQL log"
    echo "0) Back to menu"
    
    read -p "Choose log to view: " log_choice
    
    case $log_choice in
        1) tail -f /var/log/patong-deployment.log 2>/dev/null || echo "Log not found" ;;
        2) sudo -u nodeapp pm2 logs 2>/dev/null || echo "PM2 not available" ;;
        3) tail -f /var/log/nginx/error.log 2>/dev/null || echo "Log not found" ;;
        4) tail -f /var/log/nginx/access.log 2>/dev/null || echo "Log not found" ;;
        5) tail -f /var/log/webhook-deploy.log 2>/dev/null || echo "Log not found" ;;
        6) tail -f /var/log/postgresql/postgresql-*.log 2>/dev/null || echo "Log not found" ;;
        0) return ;;
        *) echo "Invalid choice" ;;
    esac
}

test_health() {
    echo -e "${BLUE}🧪 Health Check Tests${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Test local health
    echo "Testing local API..."
    if curl -s http://localhost:3000/health >/dev/null; then
        echo -e "  ✅ Local API: ${GREEN}Healthy${NC}"
    else
        echo -e "  ❌ Local API: ${RED}Not responding${NC}"
    fi
    
    # Test external URLs
    urls=(
        "https://$DOMAIN"
        "https://api.$DOMAIN/health"
        "https://app.$DOMAIN"
        "https://admin.$DOMAIN"
    )
    
    echo "Testing external URLs..."
    for url in "${urls[@]}"; do
        if curl -s "$url" >/dev/null; then
            echo -e "  ✅ $url: ${GREEN}Accessible${NC}"
        else
            echo -e "  ❌ $url: ${RED}Not accessible${NC}"
        fi
    done
}

test_urls() {
    echo -e "${BLUE}🌐 URL Testing${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    urls=(
        "https://$DOMAIN"
        "https://www.$DOMAIN" 
        "https://api.$DOMAIN"
        "https://api.$DOMAIN/health"
        "https://app.$DOMAIN"
        "https://admin.$DOMAIN"
        "http://$SERVER_IP:4200/hooks/deploy-backend-master"
    )
    
    for url in "${urls[@]}"; do
        echo -n "Testing $url... "
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        
        case $response in
            200|301|302) echo -e "${GREEN}✅ OK ($response)${NC}" ;;
            000) echo -e "${RED}❌ Not reachable${NC}" ;;
            *) echo -e "${YELLOW}⚠️  $response${NC}" ;;
        esac
    done
}

test_email() {
    echo -e "${BLUE}📧 Email System Testing${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Test email health endpoint
    if curl -s http://localhost:3000/test/email/health >/dev/null; then
        echo -e "✅ Email health endpoint: ${GREEN}Available${NC}"
        
        read -p "Enter email address for test: " test_email
        if [[ $test_email =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
            curl -X POST http://localhost:3000/test/email/welcome \
                -H 'Content-Type: application/json' \
                -d "{\"email\":\"$test_email\",\"customerName\":\"Test User\"}" 2>/dev/null
            echo -e "✅ Test email sent to: ${GREEN}$test_email${NC}"
        else
            echo -e "❌ Invalid email format"
        fi
    else
        echo -e "❌ Email health endpoint: ${RED}Not available${NC}"
    fi
}

check_performance() {
    echo -e "${BLUE}📈 Server Performance${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo -e "${CYAN}CPU & Memory:${NC}"
    top -bn1 | head -5
    
    echo -e "${CYAN}Disk Usage:${NC}"
    df -h
    
    echo -e "${CYAN}Network:${NC}"
    netstat -tuln | grep LISTEN | head -10
    
    echo -e "${CYAN}Load Average:${NC}"
    uptime
}

check_processes() {
    echo -e "${BLUE}🔍 Process Information${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo -e "${CYAN}Node.js processes:${NC}"
    ps aux | grep -E "(node|pm2)" | grep -v grep
    
    echo -e "${CYAN}Nginx processes:${NC}"
    ps aux | grep nginx | grep -v grep
    
    echo -e "${CYAN}Database processes:${NC}"
    ps aux | grep postgres | grep -v grep | head -5
}

edit_env() {
    if [ -f "/var/www/patong-boxing/.env" ]; then
        echo -e "${BLUE}🔧 Editing Environment Variables${NC}"
        echo "Current .env location: /var/www/patong-boxing/.env"
        read -p "Press Enter to open with nano, or Ctrl+C to cancel..."
        nano /var/www/patong-boxing/.env
        
        echo "Restarting application to apply changes..."
        if id "nodeapp" &>/dev/null; then
            sudo -u nodeapp pm2 restart all
        fi
    else
        echo -e "${RED}❌ .env file not found at /var/www/patong-boxing/.env${NC}"
    fi
}

create_backup() {
    BACKUP_DIR="/var/backups/patong-$(date +%Y%m%d-%H%M%S)"
    echo -e "${BLUE}💾 Creating Backup${NC}"
    echo "Backup location: $BACKUP_DIR"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup application
    if [ -d "/var/www/patong-boxing" ]; then
        cp -r /var/www/patong-boxing "$BACKUP_DIR/"
        echo "✅ Application files backed up"
    fi
    
    # Backup database
    if command -v pg_dump >/dev/null 2>&1; then
        sudo -u postgres pg_dump patongdb > "$BACKUP_DIR/patongdb.sql" 2>/dev/null && echo "✅ Database backed up"
    fi
    
    # Backup nginx config
    cp -r /etc/nginx/sites-available "$BACKUP_DIR/" 2>/dev/null && echo "✅ Nginx config backed up"
    
    echo -e "${GREEN}Backup completed: $BACKUP_DIR${NC}"
}

update_ssl() {
    echo -e "${BLUE}🔒 Updating SSL Certificates${NC}"
    certbot renew --dry-run && echo "SSL renewal test passed"
    certbot renew && echo "SSL certificates renewed"
    systemctl reload nginx
}

check_security() {
    echo -e "${BLUE}🛡️ Security Check${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo -e "${CYAN}UFW Status:${NC}"
    ufw status
    
    echo -e "${CYAN}Fail2ban Status:${NC}"
    fail2ban-client status
    
    echo -e "${CYAN}SSL Certificate Status:${NC}"
    certbot certificates | head -10
    
    echo -e "${CYAN}Open Ports:${NC}"
    netstat -tuln | grep LISTEN
}

optimize_system() {
    echo -e "${BLUE}🔧 System Optimization${NC}"
    
    # Clear logs
    journalctl --vacuum-time=7d
    
    # Clean package cache
    apt autoremove -y
    apt autoclean
    
    # Optimize PM2
    if id "nodeapp" &>/dev/null; then
        sudo -u nodeapp pm2 optimize
    fi
    
    echo "System optimization completed"
}

# Main loop
while true; do
    show_menu
    read -p "Choose an option [0-18]: " choice
    echo ""
    execute_command "$choice"
    echo ""
    read -p "Press Enter to continue..."
    clear
done
EOF
