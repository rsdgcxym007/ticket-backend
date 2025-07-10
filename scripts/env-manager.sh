#!/bin/bash

# Environment Management Script
# This script helps manage different environment configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Environment Management Script${NC}"
echo "=================================="

# Function to display usage
usage() {
    echo "Usage: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  switch ENV    Switch to specified environment (.env.ENV)"
    echo "  create ENV    Create new environment file"
    echo "  list         List available environment files"
    echo "  validate ENV Validate environment file"
    echo "  backup       Backup current .env file"
    echo "  help         Show this help message"
    echo ""
    echo "Environments:"
    echo "  dev          Development environment"
    echo "  prod         Production environment"
    echo "  test         Testing environment"
    echo "  staging      Staging environment"
    echo ""
    echo "Examples:"
    echo "  $0 switch prod     # Switch to production environment"
    echo "  $0 create staging  # Create staging environment file"
    echo "  $0 validate dev    # Validate development environment"
}

# Function to list available environment files
list_envs() {
    echo -e "${BLUE}📋 Available environment files:${NC}"
    echo ""
    
    if [ -f ".env" ]; then
        echo -e "  ${GREEN}✓${NC} .env (current)"
    else
        echo -e "  ${RED}✗${NC} .env (missing)"
    fi
    
    for file in .env.*; do
        if [ -f "$file" ]; then
            env_name=$(echo "$file" | sed 's/.env.//')
            echo -e "  ${GREEN}✓${NC} $file ($env_name)"
        fi
    done
    
    echo ""
}

# Function to backup current .env file
backup_env() {
    if [ -f ".env" ]; then
        backup_name=".env.backup.$(date +%Y%m%d-%H%M%S)"
        cp .env "$backup_name"
        echo -e "${GREEN}✅ Backed up current .env to $backup_name${NC}"
    else
        echo -e "${YELLOW}⚠️ No .env file to backup${NC}"
    fi
}

# Function to switch environment
switch_env() {
    local env_name="$1"
    local env_file=".env.$env_name"
    
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}❌ Environment file $env_file not found${NC}"
        echo ""
        list_envs
        return 1
    fi
    
    # Backup current .env if it exists
    backup_env
    
    # Copy environment file to .env
    cp "$env_file" .env
    echo -e "${GREEN}✅ Switched to $env_name environment${NC}"
    echo ""
    
    # Show current environment info
    echo -e "${BLUE}📊 Current environment configuration:${NC}"
    if grep -q "NODE_ENV" .env; then
        node_env=$(grep "NODE_ENV" .env | cut -d'=' -f2)
        echo "  NODE_ENV: $node_env"
    fi
    if grep -q "PORT" .env; then
        port=$(grep "PORT" .env | cut -d'=' -f2)
        echo "  PORT: $port"
    fi
    if grep -q "DATABASE_HOST" .env; then
        db_host=$(grep "DATABASE_HOST" .env | cut -d'=' -f2)
        echo "  DATABASE_HOST: $db_host"
    fi
}

# Function to create new environment file
create_env() {
    local env_name="$1"
    local env_file=".env.$env_name"
    
    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}⚠️ Environment file $env_file already exists${NC}"
        read -p "Do you want to overwrite it? (y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo "Cancelled."
            return 1
        fi
    fi
    
    # Copy from .env.example or .env.prod as template
    if [ -f ".env.example" ]; then
        cp .env.example "$env_file"
        echo -e "${GREEN}✅ Created $env_file from .env.example template${NC}"
    elif [ -f ".env.prod" ]; then
        cp .env.prod "$env_file"
        echo -e "${GREEN}✅ Created $env_file from .env.prod template${NC}"
    else
        # Create basic template
        cat > "$env_file" << EOF
# $env_name Environment Configuration
NODE_ENV=$env_name
PORT=4000

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
DATABASE_NAME=ticket_backend

# JWT Configuration
JWT_SECRET=your-jwt-secret-change-this

# Add your environment-specific configurations here
EOF
        echo -e "${GREEN}✅ Created basic $env_file template${NC}"
    fi
    
    echo -e "${YELLOW}📝 Please edit $env_file to configure your $env_name environment${NC}"
}

# Function to validate environment file
validate_env() {
    local env_name="$1"
    local env_file=".env.$env_name"
    
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}❌ Environment file $env_file not found${NC}"
        return 1
    fi
    
    echo -e "${BLUE}🔍 Validating $env_file...${NC}"
    echo ""
    
    # Required variables
    required_vars=("NODE_ENV" "PORT" "DATABASE_HOST" "DATABASE_USERNAME" "DATABASE_PASSWORD" "DATABASE_NAME" "JWT_SECRET")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" "$env_file"; then
            value=$(grep "^$var=" "$env_file" | cut -d'=' -f2)
            if [ -z "$value" ] || [ "$value" = "your-password" ] || [ "$value" = "your-jwt-secret" ]; then
                echo -e "  ${YELLOW}⚠️${NC} $var: needs to be configured"
                missing_vars+=("$var")
            else
                echo -e "  ${GREEN}✓${NC} $var: configured"
            fi
        else
            echo -e "  ${RED}✗${NC} $var: missing"
            missing_vars+=("$var")
        fi
    done
    
    echo ""
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ Environment file validation passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Environment file validation failed${NC}"
        echo "Missing or unconfigured variables: ${missing_vars[*]}"
        return 1
    fi
}

# Main script logic
case "$1" in
    "switch")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Please specify environment name${NC}"
            usage
            exit 1
        fi
        switch_env "$2"
        ;;
    "create")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Please specify environment name${NC}"
            usage
            exit 1
        fi
        create_env "$2"
        ;;
    "list")
        list_envs
        ;;
    "validate")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Please specify environment name${NC}"
            usage
            exit 1
        fi
        validate_env "$2"
        ;;
    "backup")
        backup_env
        ;;
    "help"|"--help"|"-h")
        usage
        ;;
    "")
        echo -e "${YELLOW}⚠️ No command specified${NC}"
        echo ""
        usage
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        usage
        exit 1
        ;;
esac
