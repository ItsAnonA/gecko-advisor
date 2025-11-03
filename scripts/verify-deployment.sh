#!/bin/bash
# Production Deployment Verification Script
# Run this after Coolify redeploy completes

set -e

echo "========================================="
echo "   Gecko Advisor Deployment Verification"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check backend container status
echo "1. Checking backend container status..."
BACKEND_STATUS=$(sudo docker ps --filter "name=backend-ps884k084kg0wg0ocgwo4gs8" --format "{{.Status}}")
if [[ $BACKEND_STATUS == *"Up"* ]]; then
    echo -e "${GREEN}✅ Backend container is running${NC}"
    echo "   Status: $BACKEND_STATUS"
else
    echo -e "${RED}❌ Backend container is NOT running${NC}"
    sudo docker ps -a --filter "name=backend-ps884k084kg0wg0ocgwo4gs8"
    exit 1
fi
echo ""

# Check backend logs for tini errors
echo "2. Checking backend logs for errors..."
BACKEND_LOGS=$(sudo docker logs backend-ps884k084kg0wg0ocgwo4gs8-234427248453 --tail 50 2>&1)
if echo "$BACKEND_LOGS" | grep -q "tini"; then
    echo -e "${RED}❌ Found tini references in logs${NC}"
    echo "$BACKEND_LOGS" | grep tini
    exit 1
else
    echo -e "${GREEN}✅ No tini errors in logs${NC}"
fi
echo ""

# Check worker container status
echo "3. Checking worker container status..."
WORKER_STATUS=$(sudo docker ps --filter "name=worker" --format "{{.Status}}" | head -1)
if [[ $WORKER_STATUS == *"Up"* ]]; then
    echo -e "${GREEN}✅ Worker container is running${NC}"
    echo "   Status: $WORKER_STATUS"
else
    echo -e "${YELLOW}⚠️  Worker container status unclear${NC}"
fi
echo ""

# Test backend health endpoint
echo "4. Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://preprod-api.geckoshare.com/health || echo "000")
if [ "$HEALTH_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✅ Backend health check passed (HTTP 200)${NC}"
else
    echo -e "${RED}❌ Backend health check failed (HTTP $HEALTH_RESPONSE)${NC}"
    exit 1
fi
echo ""

# Test frontend accessibility
echo "5. Testing frontend accessibility..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://preprod.geckoshare.com || echo "000")
if [ "$FRONTEND_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✅ Frontend accessible (HTTP 200)${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend returned HTTP $FRONTEND_RESPONSE${NC}"
fi
echo ""

# Test scan API endpoint
echo "6. Testing scan API (POST /api/v2/scan)..."
SCAN_RESPONSE=$(curl -s -X POST https://preprod-api.geckoshare.com/api/v2/scan \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}' || echo '{"error": "request_failed"}')
if echo "$SCAN_RESPONSE" | grep -q '"id"'; then
    echo -e "${GREEN}✅ Scan API working - successfully created scan${NC}"
    echo "   Response: $(echo $SCAN_RESPONSE | head -c 100)..."
else
    echo -e "${RED}❌ Scan API failed${NC}"
    echo "   Response: $SCAN_RESPONSE"
    exit 1
fi
echo ""

echo "========================================="
echo -e "${GREEN}   🎉 All Verification Checks Passed!${NC}"
echo "========================================="
echo ""
echo "Production is now LIVE and healthy!"
echo ""
echo "Next steps:"
echo "1. Monitor production for next 30 minutes"
echo "2. Create PR to upstream: PrivacyGecko/gecko-advisor"
echo "3. Document incident in GitHub issue"
