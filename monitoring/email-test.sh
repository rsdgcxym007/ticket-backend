#!/bin/bash

# Email Test Script for Patong Boxing Stadium API
# Tests email functionality with different methods

PROJECT_DIR="/var/www/backend/ticket-backend"
LOG_FILE="/var/log/email-test.log"
TEST_EMAIL="rsdgcxym@gmail.com"

# Log function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Test 1: Node.js Email via API
test_node_email() {
    log_message "Testing Node.js email via API..."
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"to\":\"$TEST_EMAIL\",\"subject\":\"API Test Email\",\"body\":\"This is a test email from the Patong Boxing Stadium API.\"}" \
        http://localhost:4000/api/test/email 2>/dev/null || echo "API_ERROR")
    
    log_message "API Response: $response"
}

# Test 2: SMTP Direct Test
test_smtp_direct() {
    log_message "Testing SMTP directly..."
    
    if command -v mail >/dev/null 2>&1; then
        echo "Test email from SMTP server - $(date)" | mail -s "SMTP Direct Test" "$TEST_EMAIL"
        log_message "SMTP direct test sent"
    else
        log_message "Mail command not available"
    fi
}

# Test 3: Check mail logs
check_mail_logs() {
    log_message "Checking mail logs..."
    
    if [ -f "/var/log/mail.log" ]; then
        tail -n 10 /var/log/mail.log | tee -a "$LOG_FILE"
    elif [ -f "/var/log/maillog" ]; then
        tail -n 10 /var/log/maillog | tee -a "$LOG_FILE"
    else
        log_message "No mail logs found"
    fi
}

# Test 4: Check postfix status
check_postfix_status() {
    log_message "Checking Postfix status..."
    
    systemctl is-active postfix | tee -a "$LOG_FILE"
    postqueue -p | tee -a "$LOG_FILE"
}

# Main function
main() {
    log_message "Starting comprehensive email test..."
    
    test_node_email
    test_smtp_direct
    check_mail_logs
    check_postfix_status
    
    log_message "Email test completed. Check results above."
}

main "$@"
