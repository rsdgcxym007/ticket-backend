#!/bin/bash

# Test AWS RDS Connection with SSL
echo "🔐 Testing AWS RDS PostgreSQL Connection with SSL"
echo "================================================="

# Check if PostgreSQL client is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client not found!"
    echo "Install with: brew install postgresql"
    exit 1
fi

# RDS Connection details
RDS_HOST="database-1.c8p4wog2qp5o.us-east-1.rds.amazonaws.com"
RDS_USERNAME="postgres"
RDS_PASSWORD="Password123!"
RDS_DATABASE="ticket_backend"

echo "🔗 Connection details:"
echo "  Host: $RDS_HOST"
echo "  Username: $RDS_USERNAME"
echo "  Database: $RDS_DATABASE"
echo "  SSL: Required"
echo ""

# Test connection with SSL
echo "🧪 Testing SSL connection..."
export PGPASSWORD="$RDS_PASSWORD"

# Try connection with SSL requirement
if psql -h "$RDS_HOST" -U "$RDS_USERNAME" -d "$RDS_DATABASE" -c "SELECT version();" --set=sslmode=require 2>/dev/null; then
    echo "✅ SSL connection successful!"
else
    echo "❌ SSL connection failed!"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "1. Check RDS security group allows your IP (49.228.165.18)"
    echo "2. Verify RDS is publicly accessible"
    echo "3. Check VPC settings"
    echo ""
    
    # Try to get more detailed error
    echo "🔍 Detailed error:"
    psql -h "$RDS_HOST" -U "$RDS_USERNAME" -d "$RDS_DATABASE" -c "SELECT 1;" --set=sslmode=require
fi

echo ""
echo "📋 RDS Security Group should allow:"
echo "  Type: PostgreSQL"
echo "  Protocol: TCP"
echo "  Port: 5432"
echo "  Source: 49.228.165.18/32 (your current IP)"
echo "         OR 0.0.0.0/0 (anywhere - less secure)"

unset PGPASSWORD
