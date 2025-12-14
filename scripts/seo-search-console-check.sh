#!/bin/bash
# SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
# SPDX-License-Identifier: MIT

#
# Search Console Reality Check Script
#
# This script helps verify SEO health by:
# 1. Fetching random URLs from sitemap
# 2. Testing them locally (simulating Googlebot)
# 3. Checking for common SEO issues
#
# After running this, manually check Google Search Console for:
# - "Crawled — currently not indexed"
# - "Duplicate without user-selected canonical"
# - "Soft 404"
# - "Page with redirect"
#
# If you see these at scale, you have canonical/content/index gating issues.
#

set -e

# Configuration
BASE_URL="${BASE_URL:-https://geckoadvisor.com}"
SITEMAP_URL="${SITEMAP_URL:-$BASE_URL/sitemap.xml}"
NUM_URLS_TO_CHECK="${NUM_URLS_TO_CHECK:-20}"
USER_AGENT="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 SEO Search Console Reality Check${NC}"
echo "==========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Sitemap: $SITEMAP_URL"
echo "URLs to check: $NUM_URLS_TO_CHECK"
echo ""

# Step 1: Fetch sitemap
echo -e "${BLUE}Step 1: Fetching sitemap...${NC}"

SITEMAP_CONTENT=$(curl -s -A "$USER_AGENT" "$SITEMAP_URL")

if [ -z "$SITEMAP_CONTENT" ]; then
    echo -e "${RED}❌ Failed to fetch sitemap${NC}"
    exit 1
fi

# Check if it's a sitemap index
if echo "$SITEMAP_CONTENT" | grep -q "<sitemapindex"; then
    echo "  Found sitemap index, fetching child sitemaps..."

    # Extract child sitemap URLs
    CHILD_SITEMAPS=$(echo "$SITEMAP_CONTENT" | grep -oP '<loc>\K[^<]+' | head -5)

    ALL_URLS=""
    for CHILD_SITEMAP in $CHILD_SITEMAPS; do
        echo "  Fetching: $CHILD_SITEMAP"
        CHILD_CONTENT=$(curl -s -A "$USER_AGENT" "$CHILD_SITEMAP")
        CHILD_URLS=$(echo "$CHILD_CONTENT" | grep -oP '<loc>\K[^<]+(?=</loc>)' | grep "/privacy-policy/" || true)
        ALL_URLS="$ALL_URLS $CHILD_URLS"
    done
else
    # Direct urlset
    ALL_URLS=$(echo "$SITEMAP_CONTENT" | grep -oP '<loc>\K[^<]+(?=</loc>)' | grep "/privacy-policy/" || true)
fi

# Count URLs
URL_COUNT=$(echo "$ALL_URLS" | wc -w | tr -d ' ')
echo -e "${GREEN}  Found $URL_COUNT privacy-policy URLs in sitemap${NC}"
echo ""

if [ "$URL_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️ No privacy-policy URLs found in sitemap${NC}"
    exit 0
fi

# Step 2: Select random URLs
echo -e "${BLUE}Step 2: Selecting $NUM_URLS_TO_CHECK random URLs...${NC}"

RANDOM_URLS=$(echo "$ALL_URLS" | tr ' ' '\n' | shuf | head -n "$NUM_URLS_TO_CHECK")
echo ""

# Step 3: Check each URL
echo -e "${BLUE}Step 3: Checking URLs (simulating Googlebot)...${NC}"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

for URL in $RANDOM_URLS; do
    DOMAIN=$(echo "$URL" | sed 's|.*/privacy-policy/||')
    echo -e "Checking: ${BLUE}$DOMAIN${NC}"

    # Fetch with Googlebot user agent
    RESPONSE=$(curl -s -w "\n%{http_code}" -A "$USER_AGENT" "$URL")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    HTML=$(echo "$RESPONSE" | sed '$d')

    ISSUES=""

    # Check 1: HTTP status
    if [ "$HTTP_CODE" -ne 200 ]; then
        ISSUES="$ISSUES  ❌ HTTP $HTTP_CODE (expected 200)\n"
    fi

    # Check 2: H1 present
    H1_COUNT=$(echo "$HTML" | grep -c "<h1" || true)
    if [ "$H1_COUNT" -eq 0 ]; then
        ISSUES="$ISSUES  ❌ No H1 tag found\n"
    elif [ "$H1_COUNT" -gt 1 ]; then
        ISSUES="$ISSUES  ⚠️ Multiple H1 tags ($H1_COUNT)\n"
    fi

    # Check 3: Meta description
    if ! echo "$HTML" | grep -q 'name="description"'; then
        ISSUES="$ISSUES  ❌ No meta description\n"
    else
        DESC_LENGTH=$(echo "$HTML" | grep -oP 'name="description"[^>]*content="\K[^"]*' | head -1 | wc -c)
        if [ "$DESC_LENGTH" -gt 160 ]; then
            ISSUES="$ISSUES  ⚠️ Meta description too long ($DESC_LENGTH chars)\n"
        fi
    fi

    # Check 4: Canonical tag
    if ! echo "$HTML" | grep -q 'rel="canonical"'; then
        ISSUES="$ISSUES  ❌ No canonical tag\n"
    else
        CANONICAL=$(echo "$HTML" | grep -oP 'rel="canonical"[^>]*href="\K[^"]*' | head -1)
        # Verify canonical matches the URL
        if [ "$CANONICAL" != "$URL" ] && [ "$CANONICAL" != "${URL%/}" ]; then
            ISSUES="$ISSUES  ⚠️ Canonical mismatch: $CANONICAL\n"
        fi
    fi

    # Check 5: robots meta
    ROBOTS_META=$(echo "$HTML" | grep -oP 'name="robots"[^>]*content="\K[^"]*' || true)
    if echo "$ROBOTS_META" | grep -qi "noindex"; then
        ISSUES="$ISSUES  ⚠️ Page has noindex directive\n"
    fi

    # Check 6: Word count (thin content)
    WORD_COUNT=$(echo "$HTML" | sed 's/<[^>]*>//g' | wc -w | tr -d ' ')
    if [ "$WORD_COUNT" -lt 300 ]; then
        ISSUES="$ISSUES  ⚠️ Thin content ($WORD_COUNT words, should be 300+)\n"
    fi

    # Check 7: JSON-LD schema
    if ! echo "$HTML" | grep -q '"@type"'; then
        ISSUES="$ISSUES  ⚠️ No JSON-LD schema found\n"
    fi

    # Check 8: Loading placeholders (client-only content)
    if echo "$HTML" | grep -qi "loading\.\.\.\|skeleton\|placeholder"; then
        ISSUES="$ISSUES  ❌ Loading placeholder found (SSR issue)\n"
    fi

    # Report results
    if [ -z "$ISSUES" ]; then
        echo -e "  ${GREEN}✅ All checks passed${NC} (HTTP $HTTP_CODE, $WORD_COUNT words)"
        ((PASS_COUNT++))
    else
        if echo -e "$ISSUES" | grep -q "❌"; then
            echo -e "  ${RED}❌ FAILED:${NC}"
            ((FAIL_COUNT++))
        else
            echo -e "  ${YELLOW}⚠️ WARNINGS:${NC}"
            ((WARN_COUNT++))
        fi
        echo -e "$ISSUES"
    fi
    echo ""
done

# Summary
echo "==========================================="
echo -e "${BLUE}Summary${NC}"
echo "==========================================="
echo -e "  ${GREEN}✅ Passed: $PASS_COUNT${NC}"
echo -e "  ${YELLOW}⚠️ Warnings: $WARN_COUNT${NC}"
echo -e "  ${RED}❌ Failed: $FAIL_COUNT${NC}"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}⚠️ Some URLs have SEO issues that need attention.${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next Steps - Manual Search Console Check:${NC}"
echo ""
echo "1. Go to Google Search Console: https://search.google.com/search-console"
echo ""
echo "2. Submit sitemap if not already:"
echo "   Sitemaps > Add new sitemap > $SITEMAP_URL"
echo ""
echo "3. Check 'Pages' report for issues:"
echo "   - 'Crawled — currently not indexed': Content quality or canonical issues"
echo "   - 'Duplicate without user-selected canonical': Missing/wrong canonical tags"
echo "   - 'Soft 404': Pages that look like errors (thin content)"
echo "   - 'Page with redirect': Unnecessary redirect chains"
echo ""
echo "4. Use 'URL Inspection' tool to check specific URLs:"
echo "   - Enter URL and click 'Test Live URL'"
echo "   - Check 'Indexability' status"
echo "   - Verify 'Detected canonical' matches expected"
echo ""
echo "5. If issues at scale, review:"
echo "   - Index gating logic (getIndexTier)"
echo "   - Domain normalization (normalizeDomain)"
echo "   - SSR content generation (ReportContent)"
echo ""
