#!/bin/bash

# ========================================
# 🚀 AUTOMATED TEST RUNNER
# ========================================
# Simple comprehensive test automation for NestJS Ticket Booking System

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_TESTS++))
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    log_info "Running: $test_name"
    ((TOTAL_TESTS++))
    
    if eval "$test_command"; then
        log_success "$test_name passed"
        return 0
    else
        log_error "$test_name failed"
        return 1
    fi
}

# Main test runner
main() {
    log_info "🚀 Starting Automated Test Suite"
    log_info "=================================="
    
    # Phase 1: Setup
    log_info "📦 Installing dependencies..."
    npm install
    
    # Phase 2: Code Quality
    log_info "🔍 Running code quality checks..."
    run_test "TypeScript Check" "npx tsc --noEmit --skipLibCheck"
    run_test "Lint Check" "npx eslint \"{src,test}/**/*.ts\" --max-warnings 5"
    
    # Phase 3: Unit Tests
    log_info "🧪 Running unit tests..."
    run_test "Jest Unit Tests" "npm run test -- --passWithNoTests --detectOpenHandles --forceExit"
    
    # Phase 4: E2E Tests
    log_info "🌐 Running E2E tests..."
    run_test "E2E Tests" "npm run test:e2e -- --detectOpenHandles --forceExit"
    
    # Phase 5: Coverage
    log_info "📊 Running test coverage..."
    run_test "Test Coverage" "npm run test:cov -- --passWithNoTests --detectOpenHandles --forceExit"
    
    # Generate report
    log_info "📋 Test Summary"
    log_info "==============="
    echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

# Execute
main "$@"
