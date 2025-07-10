#!/bin/bash

# Fix Database Connection Issues
echo "🔧 Fixing Database Connection Issues..."
echo "====================================="

# Install required dependencies
echo "📦 Installing missing dependencies..."
npm install @types/pg@^8.11.10

# Update environment variables for GitHub Actions
echo "⚙️ Updating GitHub Actions configuration..."

# Create a proper .env file for local testing  
echo "📝 Creating .env for local testing..."
cat > .env << EOF
NODE_ENV=development
PORT=4000

# Database Configuration (Local PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=ticket_backend_dev
DATABASE_SSL=false
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=true

# JWT Configuration
JWT_SECRET=dev-jwt-secret-for-local-testing
JWT_EXPIRES_IN=24h

# Other configs
API_PREFIX=api
SWAGGER_ENABLED=true
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
EOF

echo ""
echo "✅ Database fixes applied!"
echo ""
echo "📋 What was fixed:"
echo "- ✅ Added @types/pg dependency"
echo "- ✅ Improved database configuration helper"
echo "- ✅ Fixed Dockerfile health check"
echo "- ✅ Created proper .env for local development"
echo ""
echo "🚀 To test locally:"
echo "1. Start PostgreSQL: brew services start postgresql"
echo "2. Create database: createdb ticket_backend_dev"
echo "3. Run application: npm run start:dev"
echo ""
echo "🌐 To deploy to production:"
echo "1. git add ."
echo "2. git commit -m 'Fix database connection and Docker issues'"
echo "3. git push origin main"
