# SEO Strategy - Gecko Advisor

**Last Updated:** 2025-11-02  
**Status:** Implementation Ready  
**Owner:** Privacy Gecko Team

---

## Executive Summary

This document outlines the comprehensive SEO strategy for Gecko Advisor, a free, open-source privacy scanner. Our goal is to rank in the top 10 for privacy scanner-related keywords within 6 months while maintaining our privacy-first principles.

**Key Targets:**
- Top 10 for "free privacy scanner" 
- Top 20 for "website privacy checker"
- 50+ keywords ranking in top 100
- 30%+ organic traffic increase in 6 months

**Strategic Approach:**
- Privacy-first SEO (no tracking, no surveillance)
- Technical excellence (Core Web Vitals, structured data)
- Content leadership (explainable privacy scoring)
- Social proof (shareable report pages)

---

## Keyword Strategy

### Primary Keywords (High Priority)

| Keyword | Monthly Volume | Difficulty | Target Page | Priority |
|---------|---------------|------------|-------------|----------|
| privacy scanner | 2.4K | Medium | Home (/) | P0 |
| website privacy checker | 1.8K | Medium | Home (/) | P0 |
| tracker detection | 1.2K | Medium-High | Home (/) | P0 |
| privacy score | 880 | Low | Report (/r/:slug) | P0 |

### Secondary Keywords (Medium Priority)

| Keyword | Monthly Volume | Difficulty | Target Page | Priority |
|---------|---------------|------------|-------------|----------|
| GDPR compliance checker | 720 | Medium | Home (/) | P1 |
| cookie scanner | 590 | Medium | Home (/) | P1 |
| third-party tracker detector | 480 | Low | About (/about) | P1 |
| website privacy audit | 390 | Low | Docs (/docs) | P1 |

### Long-Tail Keywords (Low Hanging Fruit)

| Keyword | Monthly Volume | Difficulty | Target Page | Priority |
|---------|---------------|------------|-------------|----------|
| how to check website privacy | 320 | Low | Docs (/docs) | P2 |
| free privacy scanner online | 260 | Low | Home (/) | P2 |
| website tracking checker | 210 | Low | Home (/) | P2 |
| check website cookies | 180 | Low | Home (/) | P2 |
| privacy policy analyzer | 150 | Low | About (/about) | P2 |

---

## Page-by-Page SEO Plan

### 1. Home Page (/)

**Target Keywords:** privacy scanner, website privacy checker, free privacy scanner online

**Title (60 chars):**
```
Free Privacy Scanner - Check Website Trackers | Gecko Advisor
```

**Meta Description (155 chars):**
```
Scan any website for trackers, cookies, and privacy issues. Get a transparent privacy score (0-100) with detailed evidence. 100% free, no limits.
```

**H1:**
```html
<h1>Free Privacy Scanner - See What's Tracking You Online</h1>
```

**Content Structure:**
- H1: Free Privacy Scanner - See What's Tracking You Online
- H2: How It Works
- H2: What We Detect
  - H3: Tracking & Analytics
  - H3: Third-Party Cookies
  - H3: Security Issues
- H2: Why Gecko Advisor?
- H2: 100% Free & Open Source

**Structured Data:**
- WebSite with SearchAction
- Organization
- FAQPage (if FAQ section exists)

**Internal Links:**
- Link to /about (learn more)
- Link to /docs (documentation)
- Link to /reports (recent scans)

---

### 2. Report Pages (/r/:slug)

**Target Keywords:** privacy score, [domain] privacy report

**Title Template (60 chars):**
```
{{domain}} Privacy Report - {{grade}} ({{score}}/100) | Gecko
```

**Meta Description Template (155 chars):**
```
Privacy analysis of {{domain}}: {{trackerCount}} trackers, {{cookieCount}} cookies, {{issueCount}} issues. View detailed privacy score and evidence.
```

**Dynamic Content:**
- Extract data from scan results
- Generate meta tags on page load
- Update social preview images (future: dynamic OG images)

**Structured Data:**
- Review schema with rating
- BreadcrumbList

**Key SEO Elements:**
- Unique title per report
- Shareable URLs (slug-based)
- Social media preview optimization
- Canonical URL per report

---

### 3. About Page (/about)

**Target Keywords:** privacy scanner, open source privacy tools

**Title (60 chars):**
```
About Gecko Advisor - 100% Free Privacy Scanner
```

**Meta Description (155 chars):**
```
Gecko Advisor is an open-source privacy scanner built by Privacy Gecko. Transparent scoring, no tracking, no limits. Built for privacy-conscious users.
```

**H1:**
```html
<h1>About Gecko Advisor</h1>
```

**Structured Data:**
- Organization
- AboutPage

---

### 4. Docs Page (/docs)

**Target Keywords:** how to check website privacy, privacy scanner guide

**Title (60 chars):**
```
Documentation - How to Use Gecko Advisor Privacy Scanner
```

**Meta Description (155 chars):**
```
Learn how to use Gecko Advisor to scan websites for privacy issues. Understanding privacy scores, tracker detection, and security analysis.
```

**Structured Data:**
- FAQPage (if FAQ format)
- Article

---

### 5. Reports Page (/reports)

**Target Keywords:** recent privacy scans, privacy audit examples

**Title (60 chars):**
```
Recent Privacy Scans | Gecko Advisor
```

**Meta Description (155 chars):**
```
Browse recent website privacy scans from Gecko Advisor. See real privacy scores, tracker detections, and security analysis from our community.
```

**Structured Data:**
- CollectionPage

---

## Technical SEO Roadmap

### Priority 0 (Critical - Week 1)

1. **Install react-helmet-async**
   - Add dependency: `pnpm add react-helmet-async`
   - Configure provider in main.tsx
   - Create base `<SEO>` component

2. **Create robots.txt**
   ```
   User-agent: *
   Allow: /
   Disallow: /api/
   Disallow: /scan/
   Disallow: /dashboard
   Disallow: /reset-password
   Disallow: /settings
   
   Sitemap: https://geckoadvisor.com/sitemap.xml
   ```

3. **Create sitemap.xml**
   - List all public pages
   - Include sample report URLs
   - Update monthly

4. **Dynamic Meta Tags for Home Page**
   - Use `<SEO>` component with target keywords
   - Implement title, description, OG tags
   - Test social previews

### Priority 1 (High - Week 2)

5. **Dynamic Report Page Meta Tags**
   - Extract scan data (domain, score, grade, counts)
   - Generate unique title/description per report
   - Update on component mount

6. **Structured Data - Home Page**
   - WebSite schema
   - Organization schema
   - SearchAction (if search box exists)

7. **Structured Data - Report Pages**
   - Review schema with aggregateRating
   - Include scan date, domain, score

8. **About & Docs Pages SEO**
   - Add unique meta tags
   - Add structured data (Organization, AboutPage, Article)

### Priority 2 (Medium - Week 3)

9. **Image Optimization**
   - Create/verify OG images (1200x630px)
   - Add alt text to all images
   - Optimize image sizes

10. **Internal Linking**
    - Add breadcrumbs to all pages
    - Cross-link between related pages
    - Add "Related Reports" section (future)

11. **Performance Optimization**
    - Ensure Core Web Vitals remain green
    - Monitor bundle size impact
    - Lazy-load non-critical content

### Priority 3 (Low - Week 4)

12. **Advanced Structured Data**
    - FAQPage for docs
    - BreadcrumbList site-wide
    - HowTo schema (if applicable)

13. **Social Sharing Enhancements**
    - Test Facebook Open Graph debugger
    - Test Twitter Card validator
    - Test LinkedIn Post Inspector

14. **SEO Documentation**
    - Create implementation guide
    - Document maintenance procedures
    - Add code comments

---

## Structured Data Schemas

### Home Page

**WebSite Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Gecko Advisor",
  "url": "https://geckoadvisor.com",
  "description": "Free, open-source privacy scanner for websites",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://geckoadvisor.com/?url={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

**Organization Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Privacy Gecko",
  "url": "https://privacygecko.com",
  "logo": "https://geckoadvisor.com/logo.png",
  "sameAs": [
    "https://github.com/PrivacyGecko"
  ],
  "description": "Privacy tools ecosystem - Building open-source tools that make privacy accessible to everyone"
}
```

### Report Page

**Review Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "itemReviewed": {
    "@type": "WebSite",
    "name": "{{domain}}"
  },
  "author": {
    "@type": "Organization",
    "name": "Gecko Advisor"
  },
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "{{score}}",
    "bestRating": "100",
    "worstRating": "0"
  },
  "datePublished": "{{scanDate}}",
  "description": "Privacy analysis of {{domain}}: {{trackerCount}} trackers detected"
}
```

---

## Content Guidelines

### Title Tags

**Best Practices:**
- Keep under 60 characters
- Include primary keyword near the start
- Include brand name (Gecko Advisor or Gecko)
- Use separators: | or -
- Be descriptive and compelling

**Examples:**
- ✅ "Free Privacy Scanner - Check Website Trackers | Gecko Advisor"
- ✅ "example.com Privacy Report - C Grade (72/100) | Gecko"
- ❌ "Home - Gecko Advisor" (not descriptive)
- ❌ "Privacy Scanner Privacy Checker Privacy Audit Tool" (keyword stuffing)

### Meta Descriptions

**Best Practices:**
- Keep under 155 characters
- Include primary keyword naturally
- Include call-to-action
- Summarize page value proposition
- Use active voice

**Examples:**
- ✅ "Scan any website for trackers, cookies, and privacy issues. Get a transparent privacy score (0-100) with detailed evidence. 100% free, no limits."
- ❌ "Gecko Advisor is a privacy scanner." (too short, not compelling)

### Header Hierarchy

**H1 Rules:**
- One H1 per page
- Include primary keyword
- 30-70 characters
- Descriptive and compelling

**H2/H3 Rules:**
- Use for content structure
- Include secondary keywords naturally
- Support user scanning behavior
- Create clear content hierarchy

---

## Success Metrics

### 3-Month Targets

- [ ] All pages have unique title/description
- [ ] Structured data validates without errors
- [ ] Google Lighthouse SEO score: 95+
- [ ] 10+ keywords ranking in top 100
- [ ] Social previews display correctly
- [ ] Sitemap submitted to Google Search Console

### 6-Month Targets

- [ ] 50+ keywords ranking in top 100
- [ ] Top 20 for "free privacy scanner"
- [ ] Top 30 for "website privacy checker"
- [ ] 500+ organic sessions/month
- [ ] 20+ domains linking to us
- [ ] Featured snippet for "how to check website privacy"

### 12-Month Targets

- [ ] Top 10 for "free privacy scanner"
- [ ] Top 15 for "website privacy checker"
- [ ] 100+ keywords ranking in top 100
- [ ] 2,000+ organic sessions/month
- [ ] 50+ quality backlinks
- [ ] Multiple featured snippets

---

## Privacy-First SEO Principles

1. **No User Tracking**
   - No Google Analytics
   - No tracking pixels
   - No user behavior surveillance

2. **No Surveillance-Based SEO**
   - No heatmaps
   - No session recording
   - No A/B testing with user data

3. **Transparent Optimization**
   - All SEO is technical and content-based
   - No manipulation or deception
   - Honest, accurate meta descriptions

4. **Privacy-Respecting Sharing**
   - Social meta tags for shareability
   - No Facebook Pixel or Twitter tracking
   - Clean, honest preview content

---

## Next Steps

1. **Week 1:** Install react-helmet-async, create SEO components
2. **Week 2:** Implement dynamic meta tags for all pages
3. **Week 3:** Add structured data schemas
4. **Week 4:** Testing, validation, documentation

**Assigned To:** Frontend Specialist, Privacy Content Writer  
**Timeline:** 4 weeks  
**Review Date:** 2025-11-30

