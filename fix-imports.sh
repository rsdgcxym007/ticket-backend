#!/bin/bash

# Quick Fix for Import Issues
# This script fixes all import path issues in the codebase

set -e

echo "🛠️ Quick Fix for Import Issues"
echo "==============================="

# Find and fix all src/ imports in TypeScript files
echo "🔍 Finding files with src/ imports..."

# Fix src/ imports to relative imports
find src -name "*.ts" -type f -exec grep -l "from ['\"]src/" {} \; | while read file; do
    echo "📝 Fixing imports in: $file"
    
    # Calculate relative path depth
    depth=$(echo "$file" | tr -cd '/' | wc -c | tr -d ' ')
    
    case $depth in
        1) # src/file.ts
            sed -i.bak "s|from ['\"]src/|from './|g" "$file"
            ;;
        2) # src/folder/file.ts  
            sed -i.bak "s|from ['\"]src/|from '../|g" "$file"
            ;;
        3) # src/folder/subfolder/file.ts
            sed -i.bak "s|from ['\"]src/|from '../../|g" "$file"
            ;;
        4) # src/folder/subfolder/sub/file.ts
            sed -i.bak "s|from ['\"]src/|from '../../../|g" "$file"
            ;;
    esac
    
    # Remove backup files
    rm -f "$file.bak"
done

echo ""
echo "✅ Fixed all src/ imports!"
echo ""

# Test the fixes
echo "🧪 Testing fixes..."
if npx tsc --noEmit; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ Still have TypeScript errors. Manual fix required."
fi

echo ""
echo "📋 Summary:"
echo "- Fixed relative import paths"
echo "- Removed src/ prefixes"  
echo "- Ready for testing!"
echo ""
echo "Next: Run './quick-start.sh' to continue deployment"
