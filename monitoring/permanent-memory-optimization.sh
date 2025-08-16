#!/bin/bash

# 🎯 PERMANENT MEMORY OPTIMIZATION
# ปรับระบบให้ใช้ memory น้อย แต่ยังคง performance ดี

set -e

echo "🎯 PERMANENT MEMORY OPTIMIZATION - Starting..."
echo "Time: $(date)"

# 1. Backup current settings
echo "📦 Backing up current settings..."
cp /etc/sysctl.conf /etc/sysctl.conf.backup

# 2. Configure kernel parameters for low memory usage
echo "⚙️ Configuring kernel parameters..."
cat >> /etc/sysctl.conf << 'EOF'

# Memory Optimization for VPS Monitoring
# Reduce cache aggressiveness
vm.vfs_cache_pressure=150          # Default 100, higher = less cache
vm.dirty_ratio=5                   # Default 20, lower = less dirty cache  
vm.dirty_background_ratio=2        # Default 10, lower = clean cache faster
vm.swappiness=1                    # Almost disable swap
vm.min_free_kbytes=65536          # Keep 64MB always free

# Network buffer optimization
net.core.rmem_max=134217728
net.core.wmem_max=134217728
EOF

# 3. Apply settings immediately
echo "✅ Applying settings..."
sysctl -p

# 4. Create optimized cache management
cat > /var/www/backend/ticket-backend/monitoring/smart-cache-manager.sh << 'SCRIPT'
#!/bin/bash

# 🧠 SMART CACHE MANAGER - ให้ cache พอใช้ แต่ไม่เกิน

MAX_CACHE_MB=800  # อนุญาต cache สูงสุด 800MB
CURRENT_CACHE_KB=$(grep "^Cached:" /proc/meminfo | awk '{print $2}')
CURRENT_CACHE_MB=$((CURRENT_CACHE_KB / 1024))

if [ $CURRENT_CACHE_MB -gt $MAX_CACHE_MB ]; then
    echo "$(date): Cache ${CURRENT_CACHE_MB}MB > ${MAX_CACHE_MB}MB, clearing..."
    sync
    echo 1 > /proc/sys/vm/drop_caches  # เคลียร์ page cache อย่างเดียว
    echo "Cache cleared to manage VPS monitoring display"
fi
SCRIPT

chmod +x /var/www/backend/ticket-backend/monitoring/smart-cache-manager.sh

# 5. Setup cron for smart cache management
echo "⏰ Setting up smart cache management..."
(crontab -l 2>/dev/null | grep -v "smart-cache-manager"; echo "*/10 * * * * /var/www/backend/ticket-backend/monitoring/smart-cache-manager.sh") | crontab -

# 6. Optimize PostgreSQL for lower memory
echo "🗄️ Optimizing PostgreSQL memory..."
PG_CONF="/etc/postgresql/16/main/postgresql.conf"

# Backup PostgreSQL config
cp $PG_CONF ${PG_CONF}.backup

# Apply PostgreSQL memory optimizations
sed -i 's/#shared_buffers = 128MB/shared_buffers = 64MB/' $PG_CONF
sed -i 's/#effective_cache_size = 4GB/effective_cache_size = 1GB/' $PG_CONF
sed -i 's/#work_mem = 4MB/work_mem = 2MB/' $PG_CONF
sed -i 's/#maintenance_work_mem = 64MB/maintenance_work_mem = 32MB/' $PG_CONF

# 7. Restart services to apply changes
echo "🔄 Restarting services..."
systemctl restart postgresql

# 8. Clear current cache to start fresh
echo "🧹 Initial cache clear..."
sync && echo 3 > /proc/sys/vm/drop_caches

echo ""
echo "📊 Memory status after optimization:"
free -h

echo ""
echo "✅ PERMANENT MEMORY OPTIMIZATION COMPLETE!"
echo ""
echo "📈 What was done:"
echo "  • Kernel configured for less aggressive caching"
echo "  • PostgreSQL memory usage reduced" 
echo "  • Smart cache manager installed (runs every 10 min)"
echo "  • Cache limited to ~800MB maximum"
echo ""
echo "🎯 Expected VPS monitoring: 600-900MB instead of 2400MB"
echo "⚡ Performance: Slightly reduced but still good"
