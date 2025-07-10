#!/bin/bash

# Database Setup Script for AWS RDS PostgreSQL
# This script helps you set up your database on AWS RDS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️ AWS RDS PostgreSQL Setup Script${NC}"
echo "======================================="

# Check if environment variables are set
if [ -z "$DATABASE_HOST" ] || [ -z "$DATABASE_USERNAME" ] || [ -z "$DATABASE_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️ Please set the following environment variables:${NC}"
    echo "DATABASE_HOST=your-rds-endpoint.region.rds.amazonaws.com"
    echo "DATABASE_USERNAME=postgres"
    echo "DATABASE_PASSWORD=your-password"
    echo "DATABASE_NAME=ticket_backend (optional, defaults to ticket_backend)"
    echo ""
    echo "Example:"
    echo 'export DATABASE_HOST="database-1.abcdefghijk.us-east-1.rds.amazonaws.com"'
    echo 'export DATABASE_USERNAME="postgres"'
    echo 'export DATABASE_PASSWORD="your-secure-password"'
    echo 'export DATABASE_NAME="ticket_backend"'
    exit 1
fi

DATABASE_NAME=${DATABASE_NAME:-ticket_backend}

echo -e "${GREEN}📋 Database Configuration:${NC}"
echo "Host: $DATABASE_HOST"
echo "Username: $DATABASE_USERNAME"
echo "Database: $DATABASE_NAME"
echo ""

# Test connection
echo -e "${YELLOW}🔗 Testing database connection...${NC}"
if PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USERNAME -d postgres -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Database connection failed!${NC}"
    echo "Please check your credentials and security group settings."
    exit 1
fi

# Create database if it doesn't exist
echo -e "${YELLOW}🏗️ Creating database if it doesn't exist...${NC}"
PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USERNAME -d postgres -c "CREATE DATABASE $DATABASE_NAME;" 2>/dev/null || echo "Database $DATABASE_NAME already exists"

# Create extensions
echo -e "${YELLOW}🔧 Setting up database extensions...${NC}"
PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USERNAME -d $DATABASE_NAME << EOF
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Show installed extensions
\dx
EOF

echo -e "${GREEN}✅ Database setup completed!${NC}"
echo ""
echo -e "${GREEN}📝 Connection string for your application:${NC}"
echo "postgresql://$DATABASE_USERNAME:$DATABASE_PASSWORD@$DATABASE_HOST:5432/$DATABASE_NAME"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo "1. Update your .env file with the database connection details"
echo "2. Run your NestJS application to auto-create tables (if using TypeORM synchronize)"
echo "3. Or run any database migrations you have prepared"
echo ""
echo -e "${GREEN}🚀 Ready to deploy your application!${NC}"
