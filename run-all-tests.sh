#!/bin/bash

# ========================================
# 🚀 COMPREHENSIVE AUTOMATED TEST SUITE
# ========================================
# ครอบคลุมทุกเคสการทดสอบ สำหรับ NestJS Ticket Booking System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Log functions
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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Test runner function
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

# Initialize test environment
setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi
    
    # Create test databases if needed
    log_info "Setting up test database..."
    # Add database setup commands here if needed
    
    log_success "Test environment setup complete"
}

# Phase 1: Code Quality Tests
run_code_quality_tests() {
    log_info "========================================"
    log_info "🔍 PHASE 1: CODE QUALITY TESTS"
    log_info "========================================"
    
    # TypeScript compilation
    run_test "TypeScript Compilation" "npx tsc --noEmit"
    
    # ESLint
    run_test "ESLint Code Quality" "npx eslint \"{src,test}/**/*.ts\" --max-warnings 0"
    
    # Prettier formatting
    run_test "Prettier Code Formatting" "npx prettier --check \"src/**/*.ts\" \"test/**/*.ts\""
    
    # Import/Export validation
    run_test "Import/Export Validation" "npx madge --circular --extensions ts src/"
}

# Phase 2: Unit Tests
run_unit_tests() {
    log_info "========================================"
    log_info "🧪 PHASE 2: UNIT TESTS"
    log_info "========================================"
    
    # Run Jest unit tests
    run_test "Jest Unit Tests" "npm run test -- --passWithNoTests --verbose"
    
    # Run unit tests with coverage
    run_test "Unit Tests with Coverage" "npm run test:cov -- --passWithNoTests --coverageThreshold='{\"global\":{\"branches\":70,\"functions\":70,\"lines\":70,\"statements\":70}}'"
}

# Phase 3: Integration Tests
run_integration_tests() {
    log_info "========================================"
    log_info "🔧 PHASE 3: INTEGRATION TESTS"
    log_info "========================================"
    
    # Database integration tests
    run_test "Database Integration Tests" "npm run test:e2e -- --testNamePattern=\"Database Integration\""
    
    # Service integration tests
    run_test "Service Integration Tests" "npm run test:e2e -- --testNamePattern=\"Service Integration\""
    
    # Module integration tests
    run_test "Module Integration Tests" "npm run test:e2e -- --testNamePattern=\"Module Integration\""
}

# Phase 4: E2E API Tests
run_e2e_api_tests() {
    log_info "========================================"
    log_info "🌐 PHASE 4: E2E API TESTS"
    log_info "========================================"
    
    # Start test server
    log_info "Starting test server..."
    npm run start:dev &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 10
    
    # Run E2E tests
    run_test "E2E API Tests" "npm run test:e2e -- --testNamePattern=\"E2E API\""
    
    # Run comprehensive E2E tests
    run_test "Comprehensive E2E Tests" "npm run test:e2e -- --testNamePattern=\"Comprehensive\""
    
    # Kill test server
    kill $SERVER_PID 2>/dev/null || true
}

# Phase 5: Business Logic Tests
run_business_logic_tests() {
    log_info "========================================"
    log_info "💼 PHASE 5: BUSINESS LOGIC TESTS"
    log_info "========================================"
    
    # Order business logic
    run_test "Order Business Logic" "npm run test:e2e -- --testNamePattern=\"Order Business Logic\""
    
    # Payment business logic
    run_test "Payment Business Logic" "npm run test:e2e -- --testNamePattern=\"Payment Business Logic\""
    
    # User role & permissions
    run_test "User Role & Permissions" "npm run test:e2e -- --testNamePattern=\"User Role.*Permissions\""
    
    # Seat booking logic
    run_test "Seat Booking Logic" "npm run test:e2e -- --testNamePattern=\"Seat Booking Logic\""
}

# Phase 6: Security Tests
run_security_tests() {
    log_info "========================================"
    log_info "🔐 PHASE 6: SECURITY TESTS"
    log_info "========================================"
    
    # Authentication tests
    run_test "Authentication Tests" "npm run test:e2e -- --testNamePattern=\"Authentication\""
    
    # Authorization tests
    run_test "Authorization Tests" "npm run test:e2e -- --testNamePattern=\"Authorization\""
    
    # Input validation tests
    run_test "Input Validation Tests" "npm run test:e2e -- --testNamePattern=\"Input Validation\""
    
    # Rate limiting tests
    run_test "Rate Limiting Tests" "npm run test:e2e -- --testNamePattern=\"Rate Limiting\""
}

# Phase 7: Performance Tests
run_performance_tests() {
    log_info "========================================"
    log_info "⚡ PHASE 7: PERFORMANCE TESTS"
    log_info "========================================"
    
    # Load testing
    run_test "Load Testing" "npm run test:e2e -- --testNamePattern=\"Load Test\""
    
    # Stress testing
    run_test "Stress Testing" "npm run test:e2e -- --testNamePattern=\"Stress Test\""
    
    # Database performance
    run_test "Database Performance" "npm run test:e2e -- --testNamePattern=\"Database Performance\""
}

# Phase 8: Edge Cases & Error Handling
run_edge_case_tests() {
    log_info "========================================"
    log_info "🚨 PHASE 8: EDGE CASES & ERROR HANDLING"
    log_info "========================================"
    
    # Error handling tests
    run_test "Error Handling Tests" "npm run test:e2e -- --testNamePattern=\"Error Handling\""
    
    # Edge case tests
    run_test "Edge Case Tests" "npm run test:e2e -- --testNamePattern=\"Edge Case\""
    
    # Boundary testing
    run_test "Boundary Testing" "npm run test:e2e -- --testNamePattern=\"Boundary\""
}

# Phase 9: Data Validation & Integrity
run_data_integrity_tests() {
    log_info "========================================"
    log_info "📊 PHASE 9: DATA VALIDATION & INTEGRITY"
    log_info "========================================"
    
    # Data validation tests
    run_test "Data Validation Tests" "npm run test:e2e -- --testNamePattern=\"Data Validation\""
    
    # Data integrity tests
    run_test "Data Integrity Tests" "npm run test:e2e -- --testNamePattern=\"Data Integrity\""
    
    # Referential integrity
    run_test "Referential Integrity" "npm run test:e2e -- --testNamePattern=\"Referential Integrity\""
}

# Phase 10: Cleanup & Teardown
cleanup_test_environment() {
    log_info "========================================"
    log_info "🧹 PHASE 10: CLEANUP & TEARDOWN"
    log_info "========================================"
    
    # Clean up test data
    log_info "Cleaning up test data..."
    
    # Stop any running services
    pkill -f "nest start" 2>/dev/null || true
    
    # Remove test artifacts
    rm -rf coverage/ .nyc_output/ test-results/ 2>/dev/null || true
    
    log_success "Test environment cleanup complete"
}

# Generate test report
generate_test_report() {
    log_info "========================================"
    log_info "📋 TEST REPORT"
    log_info "========================================"
    
    echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}Success Rate:${NC} $success_rate%"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed. Check the logs above.${NC}"
        return 1
    fi
}

# Main execution
main() {
    log_info "🚀 Starting Comprehensive Automated Test Suite"
    log_info "=================================================="
    
    setup_test_environment
    
    # Run all test phases
    run_code_quality_tests
    run_unit_tests
    run_integration_tests
    run_e2e_api_tests
    run_business_logic_tests
    run_security_tests
    run_performance_tests
    run_edge_case_tests
    run_data_integrity_tests
    
    cleanup_test_environment
    generate_test_report
}

# Execute main function
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
