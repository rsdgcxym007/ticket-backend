#!/bin/bash

# Test AWS RDS Connection Script
echo "🔗 Testing AWS RDS Connection..."
echo "==============================="

# Load environment variables
source .env

echo "📊 Connection Details:"
echo "  Host: $DATABASE_HOST"
echo "  Port: $DATABASE_PORT"
echo "  Username: $DATABASE_USERNAME"
echo "  Database: $DATABASE_NAME"
echo "  SSL: $DATABASE_SSL"
echo ""

# Test connection using psql if available
if command -v psql &> /dev/null; then
    echo "🧪 Testing connection with psql..."
    PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USERNAME -d $DATABASE_NAME -c "SELECT version();" --set=sslmode=require
    
    if [ $? -eq 0 ]; then
        echo "✅ Database connection successful!"
        echo ""
        echo "🗄️ Testing database structure..."
        PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USERNAME -d $DATABASE_NAME --set=sslmode=require -c "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;"
    else
        echo "❌ Database connection failed!"
        echo ""
        echo "🔧 Troubleshooting:"
        echo "1. Check if your IP is whitelisted in AWS RDS Security Groups"
        echo "2. Verify RDS instance is running"
        echo "3. Check credentials in .env file"
    fi
else
    echo "⚠️ psql not found. Installing PostgreSQL client..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Installing via Homebrew..."
        brew install postgresql
    else
        echo "Please install PostgreSQL client manually"
    fi
fi

echo ""
echo "🚀 Starting NestJS application..."
npm run start:dev
