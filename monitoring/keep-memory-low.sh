#!/bin/bash

# 🧹 KEEP MEMORY LOW - ทำให้ VPS monitoring แสดง memory ต่ำ
# โดยการเคลียร์ cache เป็นระยะ

echo "🧹 Clearing cache to keep VPS monitoring low..."

# Clear cache ทุกประเภท
sync
echo 3 > /proc/sys/vm/drop_caches

# Compact memory
echo 1 > /proc/sys/vm/compact_memory 2>/dev/null || true

echo "✅ Cache cleared - VPS monitoring should show lower memory now"

# แสดงผล
free -h
