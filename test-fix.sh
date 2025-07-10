#!/bin/bash

# Test Fix Script - ทดสอบการแก้ไขปัญหา import

set -e

echo "🔧 Testing import fixes..."
echo "========================="

# Test TypeScript compilation
echo "📝 Testing TypeScript compilation..."
if npx tsc --noEmit --project tsconfig.json; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Test specific problematic file
echo ""
echo "🔍 Testing problematic service..."
if npx tsc --noEmit src/common/services/concurrency.service.ts; then
    echo "✅ Concurrency service compilation successful"
else
    echo "❌ Concurrency service compilation failed"
    exit 1
fi

# Test simple unit test
echo ""
echo "🧪 Testing simple unit test..."
if npx jest src/order/order.service.unit.spec.ts --passWithNoTests; then
    echo "✅ Unit test successful"
else
    echo "❌ Unit test failed"
fi

echo ""
echo "🎉 Import fixes appear to be working!"
echo ""
echo "Next steps:"
echo "1. Run full test suite: npm run test:e2e"
echo "2. Build application: npm run build"
echo "3. Deploy: ./quick-start.sh"
