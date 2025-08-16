#!/bin/bash

# Enhanced Build Script for Patong Boxing Stadium API
# Handles Node.js version compatibility and multiple build methods

set -e

# Configuration
PROJECT_DIR="/var/www/backend/ticket-backend"
LOG_FILE="/var/log/enhanced-build.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}" | tee -a "$LOG_FILE"
}

# Check Node.js version and set appropriate flags
check_node_version() {
    local node_version=$(node -v | cut -d'.' -f1 | sed 's/v//')
    log "Current Node.js version: $(node -v)"
    
    if [ "$node_version" -lt 20 ]; then
        warning "Node.js version is older than 20, setting compatibility flags"
        export NODE_OPTIONS="--max-old-space-size=1024 --no-warnings"
        export NPM_CONFIG_ENGINE_STRICT=false
    else
        export NODE_OPTIONS="--max-old-space-size=2048"
    fi
    
    log "Node options set: $NODE_OPTIONS"
}

# Enhanced dependency installation
install_dependencies() {
    log "Starting dependency installation..."
    
    # Clean previous installations
    log "Cleaning previous installations..."
    rm -rf node_modules/ package-lock.json yarn.lock 2>/dev/null || true
    
    # Clear npm cache
    log "Clearing npm cache..."
    npm cache clean --force 2>/dev/null || true
    
    # Install with compatibility flags
    log "Installing dependencies with compatibility flags..."
    if npm install --production=false --no-audit --no-fund --legacy-peer-deps --engine-strict=false; then
        success "Dependencies installed successfully"
        return 0
    else
        error "Dependency installation failed"
        return 1
    fi
}

# Enhanced build process
build_application() {
    log "Starting build process..."
    
    # Clean build directory
    log "Cleaning build directory..."
    rm -rf dist/ tsconfig.build.tsbuildinfo .tsbuildinfo 2>/dev/null || true
    
    # Check for required files
    if [ ! -f "package.json" ]; then
        error "package.json not found"
        return 1
    fi
    
    if [ ! -f "tsconfig.json" ]; then
        error "tsconfig.json not found"
        return 1
    fi
    
    # Try multiple build methods
    local build_success=false
    
    # Method 1: npm run build
    log "Attempting build with npm run build..."
    if timeout 300 npm run build 2>&1 | tee -a "$LOG_FILE"; then
        build_success=true
        success "Build completed with npm run build"
    else
        warning "npm run build failed, trying alternative methods..."
        
        # Method 2: Direct NestJS build
        log "Attempting build with npx nest build..."
        if timeout 300 npx nest build 2>&1 | tee -a "$LOG_FILE"; then
            build_success=true
            success "Build completed with npx nest build"
        else
            warning "npx nest build failed, trying TypeScript compilation..."
            
            # Method 3: Direct TypeScript compilation
            log "Attempting build with npx tsc..."
            if timeout 300 npx tsc 2>&1 | tee -a "$LOG_FILE"; then
                build_success=true
                success "Build completed with npx tsc"
            else
                error "All build methods failed"
            fi
        fi
    fi
    
    if [ "$build_success" = true ]; then
        # Verify build output
        verify_build
        return $?
    else
        return 1
    fi
}

# Verify build output
verify_build() {
    log "Verifying build output..."
    
    if [ ! -d "dist/" ]; then
        error "Build directory 'dist/' not found"
        return 1
    fi
    
    if [ ! -f "dist/main.js" ]; then
        error "Main entry file 'dist/main.js' not found"
        log "Contents of dist directory:"
        ls -la dist/ 2>&1 | tee -a "$LOG_FILE"
        return 1
    fi
    
    # Check file size
    local file_size=$(stat -c%s "dist/main.js" 2>/dev/null || stat -f%z "dist/main.js" 2>/dev/null || echo "0")
    if [ "$file_size" -lt 1000 ]; then
        error "Build output seems too small (${file_size} bytes)"
        return 1
    fi
    
    success "Build verification passed - dist/main.js exists (${file_size} bytes)"
    
    # List build artifacts
    log "Build artifacts:"
    find dist/ -type f -name "*.js" -o -name "*.json" -o -name "*.map" | head -10 | tee -a "$LOG_FILE"
    
    local total_files=$(find dist/ -type f | wc -l)
    log "Total build files: $total_files"
    
    return 0
}

# Quick application test
test_application() {
    log "Testing application startup..."
    
    # Quick syntax check
    if timeout 10 node -c dist/main.js; then
        success "Application syntax check passed"
    else
        warning "Application syntax check failed (this might be normal if it requires runtime dependencies)"
    fi
    
    # Try to get version info
    if timeout 10 node dist/main.js --version 2>/dev/null; then
        success "Application version check passed"
    else
        warning "Application version check failed (this might be normal if the app doesn't support --version flag)"
    fi
}

# Main execution
main() {
    log "Starting enhanced build process..."
    
    # Change to project directory
    cd "$PROJECT_DIR" || {
        error "Cannot access project directory: $PROJECT_DIR"
        exit 1
    }
    
    # Check Node.js version and set flags
    check_node_version
    
    # Install dependencies
    if ! install_dependencies; then
        error "Dependency installation failed"
        exit 1
    fi
    
    # Build application
    if ! build_application; then
        error "Build process failed"
        exit 1
    fi
    
    # Test application
    test_application
    
    success "Enhanced build process completed successfully!"
    log "Build log saved to: $LOG_FILE"
}

# Execute main function
main "$@"
