#!/bin/bash

# Script to setup test database for local testing and CI/CD
# This script creates the test database and ensures proper permissions

set -e  # Exit on any error

echo "🔧 Setting up test database..."

# Get database credentials from environment or use defaults
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_USER=${DATABASE_USERNAME:-postgres}
DB_PASSWORD=${DATABASE_PASSWORD:-postgres}
DB_NAME=${DATABASE_NAME:-test_db}

echo "📋 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"

# Function to run SQL commands
run_sql() {
    if [ -n "$DB_PASSWORD" ]; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "$1"
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "$1"
    fi
}

# Check if we can connect to PostgreSQL
echo "🔍 Checking PostgreSQL connection..."
if ! run_sql "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Cannot connect to PostgreSQL!"
    echo "   Please ensure PostgreSQL is running and credentials are correct."
    exit 1
fi

echo "✅ PostgreSQL connection successful!"

# Check if test database exists and create if it doesn't
echo "🏗️ Creating test database if not exists..."
if run_sql "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" | grep -q 1; then
    echo "ℹ️ Test database '$DB_NAME' already exists"
else
    echo "📦 Creating test database '$DB_NAME'..."
    run_sql "CREATE DATABASE \"$DB_NAME\";"
    echo "✅ Test database '$DB_NAME' created successfully!"
fi

# Grant permissions (if needed)
echo "🔐 Ensuring proper permissions..."
run_sql "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";" || true

echo "🎉 Test database setup completed successfully!"
echo "💡 You can now run tests with: npm run test:e2e"
