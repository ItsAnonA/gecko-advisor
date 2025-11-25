# Task: Homepage Technical Capability Sections

## Objective
Replace marketing-style homepage sections with authentic technical capability descriptions for Gecko Advisor open-source privacy scanner.

## File to Modify
`/Users/pothamsettyk/Projects/Privacy-Advisor/apps/frontend/src/pages/Home.tsx`

## Changes Required

### Change 1: "What We Scan" Section (Lines ~233-267)

**ADD section heading** before the EnhancedTrustIndicator grid:
```tsx
<h2 className="text-3xl font-bold text-center text-light-primary mb-8">
  What We Scan
</h2>
```

**REPLACE the 3 EnhancedTrustIndicator components** with:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <EnhancedTrustIndicator
    variant="gecko"
    icon={
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="8" cy="10" r="1" fill="currentColor" />
        <circle cx="16" cy="10" r="1" fill="currentColor" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <circle cx="9" cy="14" r="1" fill="currentColor" />
        <circle cx="15" cy="14" r="1" fill="currentColor" />
      </svg>
    }
    title="Cookies & Storage"
    description="Third-party cookies, localStorage, sessionStorage, and tracking pixels"
  />

  <EnhancedTrustIndicator
    variant="blue"
    icon={
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    }
    title="Trackers & Analytics"
    description="Google Analytics, Facebook Pixel, ad networks, and marketing tools"
  />

  <EnhancedTrustIndicator
    variant="amber"
    icon={
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    }
    title="Security Headers"
    description="CSP, HSTS, X-Frame-Options, and security best practices"
  />
</div>
```

---

### Change 2: "What Gets Analyzed" Section (Lines ~269-324)

**REPLACE section heading** (line ~271-273):
```tsx
<h2 className="text-2xl md:text-3xl font-bold text-center text-light-primary mb-8 md:mb-12">
  What Gets Analyzed
</h2>
```

**REPLACE Step 1 content** (lines ~280-286):
```tsx
<h3 className="text-lg md:text-xl font-bold text-light-primary mb-2">
  Crawler Analysis
</h3>
<p className="text-sm md:text-base text-light-secondary leading-relaxed">
  Fetches page HTML, JavaScript, CSS, and all third-party resources
</p>
```

**REPLACE Step 2 content** (lines ~298-304):
```tsx
<h3 className="text-lg md:text-xl font-bold text-light-primary mb-2">
  Privacy Detection
</h3>
<p className="text-sm md:text-base text-light-secondary leading-relaxed">
  Cross-references against EasyPrivacy and WhoTracks.Me tracker databases
</p>
```

**REPLACE Step 3 content** (lines ~316-322):
```tsx
<h3 className="text-lg md:text-xl font-bold text-light-primary mb-2">
  Security Audit
</h3>
<p className="text-sm md:text-base text-light-secondary leading-relaxed">
  Validates security headers, certificates, and privacy best practices
</p>
```

---

## Technical Requirements

1. **Keep all existing structure**: section tags, divs, responsive classes
2. **Keep visual design**: gradient circles, shadows, arrows, spacing
3. **Keep responsive behavior**: arrows rotate on mobile (rotate-90 md:rotate-0)
4. **No TypeScript changes**: Component props remain the same

## Technical Accuracy Notes

- **EasyPrivacy and WhoTracks.Me**: Verified in `/apps/worker/src/lists.ts` (actual databases used)
- **Security headers**: CSP, HSTS, X-Frame-Options are real checks performed
- **Crawler behavior**: Accurately describes what the scanner does

## Success Criteria

- ✅ TypeScript compiles with no errors
- ✅ Icons render correctly (cookie, target, shield)
- ✅ Section headings updated
- ✅ All descriptions technically accurate
- ✅ Visual design maintained (gradients, shadows, spacing)
- ✅ Mobile responsive (cards stack, arrows rotate)

## Testing

After implementation:
1. Run `pnpm --filter @gecko-advisor/frontend dev`
2. Verify homepage loads without errors
3. Check icons render correctly
4. Test mobile layout (resize browser)
5. Run `pnpm typecheck` to ensure no type errors

---

## Context

This change transforms the homepage from generic marketing content to authentic technical capability showcase - perfect for an open-source project targeting developers and privacy advocates.

**Before**: "Open Source & Auditable", "Privacy-First, Always", "Evidence-Backed Scores"
**After**: "Cookies & Storage", "Trackers & Analytics", "Security Headers"

**Before**: "Enter Any URL", "Instant Analysis", "Share Your Report"
**After**: "Crawler Analysis", "Privacy Detection", "Security Audit"

This is more honest, more technical, and builds more credibility with the target audience.
