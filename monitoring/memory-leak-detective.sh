#!/bin/bash

# 🔍 Memory Leak Detective Script
# ตรวจสอบสาเหตุ memory leak แบบละเอียด

set -e

echo "🔍 MEMORY LEAK DETECTIVE - Starting Investigation..."
echo "Time: $(date)"

cd /var/www/backend/ticket-backend

echo ""
echo "📊 Current Memory Status:"
free -h

echo ""
echo "🔍 Node.js Process Analysis:"
ps aux | grep node | grep -v grep

echo ""
echo "🧪 Checking Event Emitter Listeners:"
node -e "
const repl = require('repl');
const EventEmitter = require('events');
console.log('Default EventEmitter max listeners:', EventEmitter.defaultMaxListeners);
process.exit(0);
"

echo ""
echo "🔍 Checking setInterval/setTimeout Count:"
echo "Searching for potential memory leaks in code..."

echo "📍 Found setInterval calls:"
grep -r "setInterval" src/ --include="*.ts" | wc -l
grep -r "setInterval" src/ --include="*.ts"

echo ""
echo "📍 Found setTimeout calls:"
grep -r "setTimeout" src/ --include="*.ts" | wc -l

echo ""
echo "📍 Found EventEmitter extensions:"
grep -r "EventEmitter" src/ --include="*.ts"

echo ""
echo "📍 Found Map/Set objects:"
grep -r "new Map\|new Set" src/ --include="*.ts" | head -5

echo ""
echo "🚨 SUSPECTED MEMORY LEAK SOURCES:"
echo "1. ConcurrencyControlMiddleware: setInterval every 60s"
echo "2. DuplicateOrderPreventionService: setInterval every 60s" 
echo "3. ProgressService: extends EventEmitter (unlimited listeners)"
echo "4. Various Maps without size limits"

echo ""
echo "💡 RECOMMENDED FIXES:"
echo "1. Add clearInterval on app shutdown"
echo "2. Set maxListeners on EventEmitter"
echo "3. Add size limits to Map objects"
echo "4. Clear setTimeout references"

echo ""
echo "✅ Memory leak investigation complete!"
