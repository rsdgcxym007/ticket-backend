#!/bin/bash
# Node.js Installation Fix Script
# Fixes Node.js/npm dependency conflicts and installation issues

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error_exit() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error_exit "This script must be run with sudo privileges"
    fi
}

# Remove conflicting packages
remove_conflicting_packages() {
    log "🧹 Removing conflicting Node.js packages..."
    
    # Stop any running npm processes
    pkill -f npm 2>/dev/null || true
    pkill -f node 2>/dev/null || true
    
    # Remove Ubuntu's nodejs and npm packages
    apt remove --purge -y nodejs npm node 2>/dev/null || true
    apt remove --purge -y libnode* 2>/dev/null || true
    apt autoremove -y 2>/dev/null || true
    apt autoclean 2>/dev/null || true
    
    # Remove any leftover files
    rm -rf /usr/lib/node_modules 2>/dev/null || true
    rm -f /usr/bin/node /usr/bin/npm /usr/bin/npx 2>/dev/null || true
    rm -f /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx 2>/dev/null || true
    
    log "✅ Conflicting packages removed"
}

# Install Node.js using NodeSource
install_nodejs_nodesource() {
    log "📦 Installing Node.js 20.x from NodeSource..."
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    
    if [ $? -ne 0 ]; then
        warning "NodeSource setup failed, trying alternative method..."
        return 1
    fi
    
    # Install Node.js
    apt-get install -y nodejs
    
    if [ $? -ne 0 ]; then
        warning "NodeSource installation failed"
        return 1
    fi
    
    return 0
}

# Install Node.js using Snap
install_nodejs_snap() {
    log "📦 Installing Node.js using Snap..."
    
    # Install snapd if not present
    apt install -y snapd || return 1
    
    # Install Node.js via snap
    snap install node --classic || return 1
    
    # Create symlinks
    ln -sf /snap/bin/node /usr/bin/node 2>/dev/null || true
    ln -sf /snap/bin/npm /usr/bin/npm 2>/dev/null || true
    ln -sf /snap/bin/npx /usr/bin/npx 2>/dev/null || true
    
    return 0
}

# Install Node.js manually
install_nodejs_manual() {
    log "📦 Installing Node.js manually from nodejs.org..."
    
    # Install prerequisites
    apt install -y wget xz-utils || return 1
    
    # Download Node.js
    cd /tmp
    wget https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz || return 1
    
    # Extract
    tar -xf node-v20.10.0-linux-x64.tar.xz || return 1
    
    # Install to /usr/local
    cp -r node-v20.10.0-linux-x64/* /usr/local/ || return 1
    
    # Create symlinks
    ln -sf /usr/local/bin/node /usr/bin/node 2>/dev/null || true
    ln -sf /usr/local/bin/npm /usr/bin/npm 2>/dev/null || true
    ln -sf /usr/local/bin/npx /usr/bin/npx 2>/dev/null || true
    
    # Clean up
    rm -rf /tmp/node-v20.10.0-linux-x64*
    
    return 0
}

# Install using NVM
install_nodejs_nvm() {
    log "📦 Installing Node.js using NVM..."
    
    # Install NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash || return 1
    
    # Source NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install Node.js 20
    nvm install 20 || return 1
    nvm use 20 || return 1
    nvm alias default 20 || return 1
    
    # Create system-wide symlinks
    ln -sf "$NVM_DIR/versions/node/$(nvm version)/bin/node" /usr/bin/node 2>/dev/null || true
    ln -sf "$NVM_DIR/versions/node/$(nvm version)/bin/npm" /usr/bin/npm 2>/dev/null || true
    ln -sf "$NVM_DIR/versions/node/$(nvm version)/bin/npx" /usr/bin/npx 2>/dev/null || true
    
    return 0
}

# Verify Node.js installation
verify_installation() {
    log "🔍 Verifying Node.js installation..."
    
    # Check if node is available
    if ! command -v node >/dev/null 2>&1; then
        return 1
    fi
    
    # Check if npm is available
    if ! command -v npm >/dev/null 2>&1; then
        return 1
    fi
    
    # Get versions
    local node_version=$(node --version 2>/dev/null)
    local npm_version=$(npm --version 2>/dev/null)
    
    if [[ -z "$node_version" || -z "$npm_version" ]]; then
        return 1
    fi
    
    log "✅ Node.js $node_version and npm $npm_version installed successfully"
    return 0
}

# Install PM2
install_pm2() {
    log "📦 Installing PM2..."
    
    npm install -g pm2 || return 1
    
    # Create symlink if needed
    if [ -f "/usr/local/bin/pm2" ] && [ ! -f "/usr/bin/pm2" ]; then
        ln -sf /usr/local/bin/pm2 /usr/bin/pm2 2>/dev/null || true
    fi
    
    # Verify PM2
    if command -v pm2 >/dev/null 2>&1; then
        local pm2_version=$(pm2 --version 2>/dev/null)
        log "✅ PM2 $pm2_version installed successfully"
        return 0
    else
        return 1
    fi
}

# Fix npm permissions
fix_npm_permissions() {
    log "🔧 Fixing npm permissions..."
    
    # Create npm global directory for non-root user
    if [ -n "$SUDO_USER" ]; then
        local npm_global_dir="/home/$SUDO_USER/.npm-global"
        mkdir -p "$npm_global_dir"
        chown -R "$SUDO_USER:$SUDO_USER" "$npm_global_dir"
        
        # Configure npm to use this directory
        sudo -u "$SUDO_USER" npm config set prefix "$npm_global_dir" 2>/dev/null || true
    fi
    
    # Fix ownership of npm cache
    if [ -d "/root/.npm" ]; then
        chmod -R 755 /root/.npm 2>/dev/null || true
    fi
    
    log "✅ npm permissions fixed"
}

# Main fix function
fix_nodejs_installation() {
    log "🚀 Starting Node.js installation fix..."
    
    # Method 1: Try NodeSource
    if install_nodejs_nodesource && verify_installation; then
        log "✅ NodeSource installation successful"
    # Method 2: Try Snap
    elif install_nodejs_snap && verify_installation; then
        log "✅ Snap installation successful"
    # Method 3: Try manual installation
    elif install_nodejs_manual && verify_installation; then
        log "✅ Manual installation successful"
    # Method 4: Try NVM (last resort)
    elif install_nodejs_nvm && verify_installation; then
        log "✅ NVM installation successful"
    else
        error_exit "All Node.js installation methods failed"
    fi
    
    # Install PM2
    if ! install_pm2; then
        error_exit "Failed to install PM2"
    fi
    
    # Fix permissions
    fix_npm_permissions
    
    log "🎉 Node.js installation fix completed successfully!"
}

# Diagnostic function
diagnose_system() {
    log "🔍 Running system diagnostics..."
    
    echo ""
    echo -e "${BLUE}=== System Information ===${NC}"
    echo "OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Unknown')"
    echo "Architecture: $(uname -m)"
    echo "Kernel: $(uname -r)"
    
    echo ""
    echo -e "${BLUE}=== Current Node.js Status ===${NC}"
    if command -v node >/dev/null 2>&1; then
        echo "Node.js: $(node --version)"
        echo "Node.js path: $(which node)"
    else
        echo "Node.js: Not installed"
    fi
    
    if command -v npm >/dev/null 2>&1; then
        echo "npm: $(npm --version)"
        echo "npm path: $(which npm)"
    else
        echo "npm: Not installed"
    fi
    
    if command -v pm2 >/dev/null 2>&1; then
        echo "PM2: $(pm2 --version)"
        echo "PM2 path: $(which pm2)"
    else
        echo "PM2: Not installed"
    fi
    
    echo ""
    echo -e "${BLUE}=== Package Manager Status ===${NC}"
    echo "apt: $(apt --version 2>/dev/null | head -1 || echo 'Not available')"
    echo "snap: $(snap --version 2>/dev/null | head -1 || echo 'Not available')"
    
    if command -v nvm >/dev/null 2>&1; then
        echo "nvm: $(nvm --version 2>/dev/null || echo 'Available but not loaded')"
    else
        echo "nvm: Not installed"
    fi
}

# Show help
show_help() {
    echo "Node.js Installation Fix Script"
    echo ""
    echo "This script fixes Node.js/npm dependency conflicts and installation issues."
    echo ""
    echo "Usage: sudo $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help       Show this help message"
    echo "  -d, --diagnose   Run system diagnostics"
    echo "  -c, --clean      Clean and reinstall (default)"
    echo "  -f, --force      Force reinstallation even if Node.js exists"
    echo ""
    echo "This script will try multiple installation methods:"
    echo "  1. NodeSource repository (recommended)"
    echo "  2. Snap package manager"
    echo "  3. Manual installation from nodejs.org"
    echo "  4. NVM (Node Version Manager)"
    echo ""
}

# Parse arguments
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    -d|--diagnose)
        diagnose_system
        exit 0
        ;;
    -f|--force)
        check_root
        remove_conflicting_packages
        fix_nodejs_installation
        ;;
    -c|--clean|"")
        check_root
        
        # Check if Node.js is already working
        if verify_installation && [ "$1" != "--force" ]; then
            log "✅ Node.js is already installed and working"
            node_version=$(node --version)
            npm_version=$(npm --version)
            log "Current versions: Node.js $node_version, npm $npm_version"
            
            # Still try to install PM2 if missing
            if ! command -v pm2 >/dev/null 2>&1; then
                install_pm2
            fi
            exit 0
        fi
        
        remove_conflicting_packages
        fix_nodejs_installation
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
