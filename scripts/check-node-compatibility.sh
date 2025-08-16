#!/bin/bash

# Node.js Compatibility Checker
# Checks if the current Node.js version is compatible with project requirements

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Node.js Compatibility Checker${NC}"
echo "=================================="

# Check current Node.js version
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

CURRENT_NODE_VERSION=$(node --version | sed 's/v//')
CURRENT_NODE_MAJOR=$(echo "$CURRENT_NODE_VERSION" | cut -d. -f1)
echo -e "Current Node.js version: ${BLUE}v$CURRENT_NODE_VERSION${NC}"

# Check npm version
if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

CURRENT_NPM_VERSION=$(npm --version)
echo -e "Current npm version: ${BLUE}v$CURRENT_NPM_VERSION${NC}"

# Read requirements from package.json
PROJECT_DIR="$(dirname "$0")/.."
PACKAGE_JSON="$PROJECT_DIR/package.json"

if [ ! -f "$PACKAGE_JSON" ]; then
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi

# Extract required Node.js version
REQUIRED_NODE=$(grep -o '"node": *"[^"]*"' "$PACKAGE_JSON" | cut -d'"' -f4 | sed 's/>=//g' | sed 's/[^0-9.]//g')
REQUIRED_NODE_MAJOR=$(echo "$REQUIRED_NODE" | cut -d. -f1)

echo -e "Required Node.js version: ${BLUE}v$REQUIRED_NODE+${NC}"

# Check compatibility
echo ""
echo -e "${BLUE}🧪 Compatibility Check${NC}"
echo "======================"

if [ "$CURRENT_NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]; then
    echo -e "${GREEN}✅ Node.js version is compatible${NC}"
    NODE_COMPATIBLE=true
else
    echo -e "${RED}❌ Node.js version is incompatible${NC}"
    echo -e "   Current: v$CURRENT_NODE_VERSION"
    echo -e "   Required: v$REQUIRED_NODE+"
    NODE_COMPATIBLE=false
fi

# Check for problematic dependencies
echo ""
echo -e "${BLUE}📦 Dependency Compatibility Check${NC}"
echo "================================="

echo "Checking for Node.js version conflicts in dependencies..."
cd "$PROJECT_DIR"

# Run a dry-run to check for engine compatibility issues
DRY_RUN_OUTPUT=$(npm install --dry-run 2>&1 || true)
EBADENGINE_COUNT=$(echo "$DRY_RUN_OUTPUT" | grep -c "EBADENGINE" || true)

if [ "$EBADENGINE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $EBADENGINE_COUNT engine compatibility warnings${NC}"
    echo -e "${YELLOW}These packages require Node.js v20 or higher:${NC}"
    echo "$DRY_RUN_OUTPUT" | grep -A2 "EBADENGINE" | grep "package:" | head -5
    if [ "$EBADENGINE_COUNT" -gt 5 ]; then
        echo -e "${YELLOW}   ... and $(($EBADENGINE_COUNT - 5)) more packages${NC}"
    fi
else
    echo -e "${GREEN}✅ No engine compatibility warnings found${NC}"
fi

# Final summary
echo ""
echo -e "${BLUE}📋 Summary${NC}"
echo "=========="

if [ "$NODE_COMPATIBLE" = true ] && [ "$EBADENGINE_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ System is fully compatible${NC}"
    echo "You can proceed with deployment."
    exit 0
elif [ "$NODE_COMPATIBLE" = true ] && [ "$EBADENGINE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  System is partially compatible${NC}"
    echo "Node.js version is sufficient, but some dependencies prefer newer versions."
    echo "Deployment should work but may produce warnings."
    exit 0
else
    echo -e "${RED}❌ System is not compatible${NC}"
    echo ""
    echo -e "${BLUE}🔧 Recommended Actions:${NC}"
    echo "1. Upgrade Node.js to version $REQUIRED_NODE or higher"
    echo "2. Use a Node.js version manager like nvm:"
    echo "   nvm install $REQUIRED_NODE"
    echo "   nvm use $REQUIRED_NODE"
    echo "3. Update your deployment environment to use Node.js v$REQUIRED_NODE+"
    exit 1
fi
