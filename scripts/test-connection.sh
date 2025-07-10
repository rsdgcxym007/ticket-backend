#!/bin/bash

# Test RDS Connection Script
# This script tests the connection to AWS RDS PostgreSQL

echo "🔍 Testing AWS RDS PostgreSQL Connection..."
echo "============================================"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env"
else
    echo "❌ .env file not found"
    exit 1
fi

echo ""
echo "Database Configuration:"
echo "- Host: $DATABASE_HOST"
echo "- Port: $DATABASE_PORT"
echo "- Database: $DATABASE_NAME"
echo "- Username: $DATABASE_USERNAME"
echo "- SSL: $DATABASE_SSL"
echo ""

# Test 1: Basic connectivity
echo "🧪 Test 1: Basic connectivity to RDS host..."
if nc -z -w5 "$DATABASE_HOST" "$DATABASE_PORT" 2>/dev/null; then
    echo "✅ Can connect to $DATABASE_HOST:$DATABASE_PORT"
elif python3 -c "import socket; sock = socket.socket(); sock.settimeout(5); result = sock.connect_ex(('$DATABASE_HOST', $DATABASE_PORT)); sock.close(); exit(result)" 2>/dev/null; then
    echo "✅ Can connect to $DATABASE_HOST:$DATABASE_PORT (via Python)"
else
    echo "❌ Cannot connect to $DATABASE_HOST:$DATABASE_PORT"
    echo "   This might be due to:"
    echo "   - Security group restrictions"
    echo "   - Network connectivity issues"
    echo "   - VPC/subnet configuration"
    echo "   Continuing with application test..."
fi

echo ""

# Test 2: PostgreSQL connection with psql (if available)
echo "🧪 Test 2: Testing PostgreSQL connection..."
if command -v psql &> /dev/null; then
    echo "📝 Using psql to test connection..."
    PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -c "SELECT version();" --set sslmode=require
    if [ $? -eq 0 ]; then
        echo "✅ PostgreSQL connection successful"
    else
        echo "❌ PostgreSQL connection failed"
    fi
else
    echo "⚠️  psql not available, skipping direct database test"
fi

echo ""

# Test 3: Test NestJS application connection
echo "🧪 Test 3: Testing NestJS application database connection..."
node -e "
const { DataSource } = require('typeorm');

const dataSource = new DataSource({
    type: 'postgres',
    host: '$DATABASE_HOST',
    port: $DATABASE_PORT,
    username: '$DATABASE_USERNAME',
    password: '$DATABASE_PASSWORD',
    database: '$DATABASE_NAME',
    ssl: $DATABASE_SSL === 'true' ? { 
        rejectUnauthorized: false,
        ca: false,
        checkServerIdentity: false
    } : false,
    synchronize: false
});

dataSource.initialize()
    .then(() => {
        console.log('✅ NestJS/TypeORM connection successful');
        return dataSource.query('SELECT NOW() as current_time');
    })
    .then((result) => {
        console.log('📅 Database time:', result[0].current_time);
        return dataSource.destroy();
    })
    .then(() => {
        console.log('✅ Connection closed properly');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ NestJS/TypeORM connection failed:', error.message);
        console.log('💡 Trying with require SSL mode...');
        
        // Try with require SSL
        const sslDataSource = new DataSource({
            type: 'postgres',
            host: '$DATABASE_HOST',
            port: $DATABASE_PORT,
            username: '$DATABASE_USERNAME',
            password: '$DATABASE_PASSWORD',
            database: '$DATABASE_NAME',
            ssl: true,
            extra: {
                ssl: {
                    rejectUnauthorized: false
                }
            },
            synchronize: false
        });
        
        return sslDataSource.initialize()
            .then(() => {
                console.log('✅ NestJS/TypeORM connection successful with SSL require mode');
                return sslDataSource.query('SELECT NOW() as current_time');
            })
            .then((result) => {
                console.log('📅 Database time:', result[0].current_time);
                return sslDataSource.destroy();
            })
            .then(() => {
                console.log('✅ Connection closed properly');
                process.exit(0);
            });
    })
    .catch((error) => {
        console.error('❌ All connection attempts failed:', error.message);
        process.exit(1);
    });
"

echo ""
echo "🎉 Connection test completed!"
echo ""
echo "📋 Next steps:"
echo "1. If all tests pass, your development environment is connected to production RDS"
echo "2. Run 'npm run start:dev' to start the application"
echo "3. Check application logs for successful database connection"
echo "4. Visit http://localhost:4000/health to verify the health endpoint"
