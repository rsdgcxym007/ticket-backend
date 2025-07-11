#!/bin/bash

echo "🚀 Testing API Performance - ticket-backend"
echo "============================================"

BASE_URL="http://localhost:4001/api/v1"

echo ""
echo "1️⃣ Testing Root Endpoint"
echo "------------------------"
time curl -s "$BASE_URL/" > /dev/null

echo ""
echo "2️⃣ Testing Dashboard Seat Availability (Cold)"
echo "----------------------------------------------"
time curl -s "$BASE_URL/dashboard/seat-availability" > /dev/null

echo ""
echo "3️⃣ Testing Dashboard Seat Availability (Warm - should be cached)"
echo "----------------------------------------------------------------"
time curl -s "$BASE_URL/dashboard/seat-availability" > /dev/null

echo ""
echo "4️⃣ Testing Main Dashboard (Cold)"
echo "--------------------------------"
time curl -s "$BASE_URL/dashboard/" > /dev/null

echo ""
echo "5️⃣ Testing Main Dashboard (Warm - should be cached)"
echo "---------------------------------------------------"
time curl -s "$BASE_URL/dashboard/" > /dev/null

echo ""
echo "6️⃣ Performance Comparison Test (5 calls each)"
echo "----------------------------------------------"

echo "Seat Availability Endpoint:"
for i in {1..5}; do
  echo -n "  Call $i: "
  time curl -s "$BASE_URL/dashboard/seat-availability" > /dev/null 2>&1
done

echo ""
echo "Main Dashboard Endpoint:"
for i in {1..5}; do
  echo -n "  Call $i: "
  time curl -s "$BASE_URL/dashboard/" > /dev/null 2>&1
done

echo ""
echo "✅ Performance Test Complete!"
echo ""
echo "Expected Results:"
echo "- First calls should be slower (database queries)"
echo "- Subsequent calls should be faster (cache hits)"
echo "- Overall response times should be under 100ms for cached data"
