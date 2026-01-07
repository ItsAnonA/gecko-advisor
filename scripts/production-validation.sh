#!/bin/bash
#
# Production Bot Safety Validation Script
#
# This script validates bot safety on production by running synthetic crawls
# with Googlebot user-agent to ensure:
# - ZERO 5xx responses (CRITICAL)
# - All placeholders have noindex meta tag (CRITICAL)
# - Cache hit rate >95% (TARGET)
# - Placeholder rate <1% (TARGET)
#
# Usage:
#   ./scripts/production-validation.sh [sample_size] [endpoint]
#
# Examples:
#   ./scripts/production-validation.sh                    # Use defaults (1000 domains, production API)
#   ./scripts/production-validation.sh 2000               # Test 2000 domains
#   ./scripts/production-validation.sh 1000 https://stage.geckoadvisor.com/api  # Test staging
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SAMPLE_SIZE="${1:-1000}"
API_ENDPOINT="${2:-https://api.geckoadvisor.com}"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}         Production Bot Safety Validation${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if we're on production server or have production DB access
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
    echo ""
    echo "This script requires access to production database to fetch domain list."
    echo ""
    echo "Options:"
    echo "  1. Run this script on production server (DATABASE_URL already set)"
    echo "  2. Export DATABASE_URL with production credentials:"
    echo "     export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
    echo "  3. Use SSH tunnel to production database:"
    echo "     ssh -L 5432:localhost:5432 production-server -N &"
    echo "     export DATABASE_URL='postgresql://user:pass@localhost:5432/dbname'"
    echo ""
    exit 1
fi

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ ERROR: pnpm not found${NC}"
    echo ""
    echo "Please install pnpm:"
    echo "  npm install -g pnpm"
    echo ""
    exit 1
fi

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo -e "${YELLOW}⚠️  tsx not found globally, using pnpm tsx${NC}"
    TSX_CMD="pnpm tsx"
else
    TSX_CMD="tsx"
fi

echo -e "${GREEN}✅ Environment checks passed${NC}"
echo ""
echo "Configuration:"
echo "  - Endpoint: ${API_ENDPOINT}"
echo "  - Sample size: ${SAMPLE_SIZE} domains"
echo "  - Database: ${DATABASE_URL%%@*}@***" # Hide password
echo ""

# Confirm before running
echo -e "${YELLOW}This will test ${SAMPLE_SIZE} domains against ${API_ENDPOINT}${NC}"
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${BLUE}Running validation...${NC}"
echo ""

# Run validation script
pnpm validate:bot-safety --sample "$SAMPLE_SIZE" --endpoint "$API_ENDPOINT"

VALIDATION_EXIT_CODE=$?

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

if [ $VALIDATION_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
    echo ""
    echo "Bot safety confirmed! Safe to proceed with URL migration."
    echo ""
    echo "Next steps:"
    echo "  1. Run cache pre-warming: pnpm prewarm:cache"
    echo "  2. Submit sitemap to Google Search Console"
    echo "  3. Monitor /health/cache endpoint for metrics"
else
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo ""
    echo "Critical issues detected. DO NOT proceed with URL migration."
    echo ""
    echo "Action items:"
    echo "  1. Review failure logs above"
    echo "  2. Fix critical issues (5xx errors, missing noindex)"
    echo "  3. Re-run validation after fixes"
    echo "  4. Consider cache pre-warming to improve hit rate"
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

exit $VALIDATION_EXIT_CODE
