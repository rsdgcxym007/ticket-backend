#!/bin/bash

# Quick Start Deployment Script
# Run this script to deploy your application step by step

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Ticket Backend Deployment - Quick Start${NC}"
echo "============================================="
echo ""

# Step 1: Check environment configuration
echo -e "${BLUE}Step 1: ตรวจสอบการตั้งค่า Environment${NC}"
echo "-------------------------------------------"

if [ ! -f ".env.prod" ]; then
    echo -e "${RED}❌ ไม่พบไฟล์ .env.prod${NC}"
    exit 1
fi

echo -e "${GREEN}✅ พบไฟล์ .env.prod${NC}"

# Validate environment
if ./scripts/env-manager.sh validate prod; then
    echo -e "${GREEN}✅ การตั้งค่า environment ถูกต้อง${NC}"
else
    echo -e "${YELLOW}⚠️ กรุณาตรวจสอบการตั้งค่าใน .env.prod${NC}"
    echo "แก้ไขค่าเหล่านี้ให้ถูกต้อง:"
    echo "- JWT_SECRET (ต้องมีความยาวอย่างน้อย 32 ตัวอักษร)"
    echo "- OAuth credentials (ถ้าใช้งาน)"
    exit 1
fi

echo ""

# Step 2: Generate JWT Secret if needed
echo -e "${BLUE}Step 2: สร้าง JWT Secret${NC}"
echo "----------------------"

if grep -q "your-super-secret-jwt-key" .env.prod; then
    echo -e "${YELLOW}🔑 กำลังสร้าง JWT Secret ใหม่...${NC}"
    
    # Generate strong JWT secret
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    # Replace in .env.prod
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.prod
    
    echo -e "${GREEN}✅ สร้าง JWT Secret ใหม่แล้ว${NC}"
    echo "JWT Secret: $JWT_SECRET"
else
    echo -e "${GREEN}✅ JWT Secret ถูกตั้งค่าแล้ว${NC}"
fi

echo ""

# Step 3: Show deployment options
echo -e "${BLUE}Step 3: เลือกวิธี Deploy${NC}"
echo "---------------------"
echo "1. 🤖 Auto Deploy (GitHub Actions) - แนะนำ"
echo "2. 📋 Manual Deploy (คู่มือการทำเอง)"
echo "3. 🐳 Docker Deploy"
echo ""

read -p "เลือกวิธี deploy (1-3): " deploy_method

case $deploy_method in
    1)
        echo ""
        echo -e "${GREEN}🤖 GitHub Actions Auto Deploy${NC}"
        echo "================================"
        echo ""
        echo "ขั้นตอนต่อไป:"
        echo ""
        echo "1. 📁 Push code ไป GitHub repository:"
        echo "   git add ."
        echo "   git commit -m \"Add production configuration\""
        echo "   git push origin main"
        echo ""
        echo "2. 🔑 ตั้งค่า GitHub Secrets (ไปที่ Settings → Secrets and variables → Actions):"
        echo ""
        echo "   AWS_EC2_HOST=54.221.160.173"
        echo "   AWS_EC2_USERNAME=ubuntu"
        echo "   AWS_EC2_PRIVATE_KEY=(เนื้อหาไฟล์ ticket-backend.pem)"
        echo ""
        echo "   RDS_HOST=database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com"
        echo "   RDS_USERNAME=postgres"
        echo "   RDS_PASSWORD=Password123!"
        echo "   RDS_DATABASE=ticket_backend"
        echo ""
        echo "   JWT_SECRET=$JWT_SECRET"
        echo ""
        echo "3. 🔧 เตรียม EC2 Instance:"
        echo "   ssh -i ticket-backend.pem ubuntu@54.221.160.173"
        echo "   # Copy และรันคำสั่งจากไฟล์ scripts/setup-ec2.sh"
        echo ""
        echo "4. 🗄️ ตั้งค่าฐานข้อมูล:"
        echo "   export DATABASE_HOST=\"database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com\""
        echo "   export DATABASE_USERNAME=\"postgres\""
        echo "   export DATABASE_PASSWORD=\"Password123!\""
        echo "   ./scripts/setup-database.sh"
        echo ""
        echo "หลังจากทำครบแล้ว push code ใหม่ เพื่อเริ่ม deployment!"
        ;;
    2)
        echo ""
        echo -e "${GREEN}📋 Manual Deploy${NC}"
        echo "=================="
        echo ""
        echo "1. 🏗️ Build application:"
        echo "   npm ci"
        echo "   npm run build"
        echo ""
        echo "2. 📦 สร้าง deployment package:"
        echo "   tar -czf deployment.tar.gz dist package*.json ecosystem.config.js .env.prod"
        echo ""
        echo "3. 🚀 Deploy ไป EC2:"
        echo "   scp -i ticket-backend.pem deployment.tar.gz ubuntu@54.221.160.173:/home/ubuntu/"
        echo ""
        echo "4. 📁 Extract และ start application:"
        echo "   ssh -i ticket-backend.pem ubuntu@54.221.160.173"
        echo "   mkdir -p /var/www/ticket-backend"
        echo "   cd /var/www/ticket-backend"
        echo "   tar -xzf ~/deployment.tar.gz"
        echo "   cp .env.prod .env"
        echo "   npm ci --only=production"
        echo "   pm2 start ecosystem.config.js --env production"
        ;;
    3)
        echo ""
        echo -e "${GREEN}🐳 Docker Deploy${NC}"
        echo "================="
        echo ""
        echo "1. 🏗️ Build Docker image:"
        echo "   docker build -t ticket-backend ."
        echo ""
        echo "2. 🚀 Run with Docker:"
        echo "   docker run -d --name ticket-backend -p 4000:4000 --env-file .env.prod ticket-backend"
        echo ""
        echo "3. 📋 หรือใช้ Docker Compose:"
        echo "   docker-compose up -d"
        ;;
    *)
        echo -e "${RED}❌ เลือกตัวเลข 1-3 เท่านั้น${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}📚 อ่านเพิ่มเติม:${NC}"
echo "- GitHub Secrets Setup: docs/GITHUB_SECRETS_SETUP.md"
echo "- Environment Guide: docs/ENVIRONMENT_GUIDE.md" 
echo "- Deployment Guide: docs/DEPLOYMENT.md"
echo ""
echo -e "${GREEN}🎉 พร้อม Deploy แล้ว!${NC}"
