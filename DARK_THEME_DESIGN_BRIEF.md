# Dark Theme Design Brief for Gecko Advisor
**Date**: November 20, 2025
**Project**: Gecko Advisor Dark Theme Implementation
**Audience**: visual-designer agent
**Branch**: preprod (experimental)
**Environment**: stage.geckoadvisor.com

---

## Executive Summary

Create a comprehensive modern minimalist dark theme design system for Gecko Advisor privacy scanner. The design must blend cutting-edge modern aesthetics (subtle glass morphism, smooth animations) with minimalist principles (high contrast, maximum readability, clean surfaces) while ensuring all content remains perfectly readable over a full-page background video.

---

## User's Strategic Decisions

### 1. Design Aesthetic: Modern + Minimalist Hybrid
Blend these two approaches:

**Modern Elements**:
- Subtle glass morphism for elevated surfaces (cards, modals, header)
- Smooth, purposeful animations (no unnecessary motion)
- Cutting-edge feel without being trendy or gimmicky
- Professional yet forward-thinking

**Minimalist Focus**:
- Clean, high-contrast surfaces (legibility first)
- No visual clutter or excessive decoration
- Maximum readability in all conditions
- Purposeful use of color and space
- Professional, timeless feel

**Result**: A dark theme that feels both modern and professional, suitable for privacy-conscious users who value both aesthetics and function.

### 2. Background Video Strategy: Full-Page Background

**Video Details**:
- File: `ga_bg_sm.mp4` (2.5MB, already optimized)
- Location: Full-page background on ALL pages (not just hero)
- Mobile: Include video on mobile (2.5MB is acceptable)
- Behavior: Autoplay, loop, muted, playsInline

**Critical Requirements**:
- Content must remain readable over video
- Opacity/overlay strategy required
- Performance: Poster image, lazy loading strategy
- Mobile considerations (video on mobile too)

**Design Question**: How should the video appear?
- Static background (fixed position)?
- Subtle parallax effect?
- Gradient overlay darkness (light top → darker bottom)?
- Different opacity on different pages (e.g., lighter on Home, darker on Report)?

### 3. Timeline: No Pressure, Do It Right
- Take 3-5 days for quality design work
- User prioritizes quality over speed
- Can iterate based on feedback
- No shortcuts or rushing

### 4. Scope: All 36 Components Eventually
See component inventory below. Prioritize:
1. Core pages (Home, Report)
2. Layout (Header, Footer)
3. Privacy components (ScoreDial, badges)
4. Interactive elements (buttons, cards, modals)

---

## Current Gecko Advisor Brand

### Color Palette (Light Theme)

**Primary Brand Colors**:
- Advisor Green: `#10b981` (emerald-500)
- Advisor Green Dark: `#047857` (emerald-600, WCAG AA compliant)
- Professional Charcoal: `#334155` (slate-700)
- Body Text: `#475569` (slate-600)

**Privacy Score Colors**:
- Safe (70-100): Green `#16a34a` (emerald-600)
- Caution (40-69): Amber `#f59e0b` (amber-500)
- Danger (0-39): Red `#ef4444` (red-500)

**Severity Indicators**:
- Low: Slate background with slate-600 text
- Medium: Amber-100 background with amber-800 text (7.48:1 contrast)
- High: Red-100 background with red-800 text (6.92:1 contrast)

**Neutral Palette**:
- Backgrounds: White, Slate-50, Slate-100
- Borders: Gray-200, Gray-300
- Text: Gray-900 (headings), Gray-700 (body), Gray-500 (muted)

### Typography
- Font Family: Inter (sans-serif)
- Headings: Bold weights (600-700)
- Body: Regular (400) and Medium (500)
- Line Heights: Relaxed for readability

### Current Design Patterns
- Cards: White background, border-2 border-gray-200, rounded-xl, shadow-lg
- Buttons: Advisor-600 background, rounded-lg, shadow-md, hover shadow-lg
- Elevation: Subtle shadows (shadow-sm, shadow-md, shadow-lg)
- Borders: 2px borders for emphasis, 1px for subtle division
- Spacing: Generous padding (p-6 to p-8 on cards)
- Animations: Subtle hover effects (translate-y, shadow changes)

---

## Component Inventory (36 Total)

### Priority 1: Core Pages & Layout (8 components)
1. **Home.tsx** - Hero section, scan input, trust badges, FAQ, How It Works
2. **ReportPage.tsx** - Full scan report with evidence, issues, recommendations
3. **Header.tsx** - Navigation bar, logo, menu, auth dropdown
4. **Footer.tsx** - Footer links, branding, legal
5. **Card.tsx** - Reusable card container (used everywhere)
6. **Button.tsx** - Primary, secondary, tertiary button variants
7. **ScoreDial.tsx** - Circular privacy score gauge (central to UX)
8. **EnhancedScoreDial.tsx** - Premium version with animations

### Priority 2: Privacy Components (8 components)
9. **GradeBadge.tsx** - Letter grade display (A-F)
10. **ScoreBadge.tsx** - Numeric score badge
11. **SeverityBadge.tsx** - Issue severity indicator
12. **EnhancedSeverityBadge.tsx** - Premium severity badge
13. **TrustBadge.tsx** - Trust indicators
14. **EnhancedTrustIndicator.tsx** - Premium trust cards
15. **EvidenceList.tsx** - List of scan evidence
16. **VirtualizedEvidenceList.tsx** - Performance-optimized evidence list

### Priority 3: Interactive Elements (10 components)
17. **LoginModal.tsx** - Login form (if needed)
18. **SignupModal.tsx** - Signup form (if needed)
19. **ForgotPasswordModal.tsx** - Password reset (if needed)
20. **ScanProgress.tsx** - Loading state during scan
21. **ProgressDial.tsx** - Animated progress circle
22. **CopyButton.tsx** - Copy to clipboard button
23. **ShareBar.tsx** - Social sharing buttons
24. **InfoPopover.tsx** - Tooltip/popover component
25. **Skeleton.tsx** - Loading skeleton screens
26. **TurnstileWidget.tsx** - Cloudflare Turnstile (invisible)

### Priority 4: Utility & Status (10 components)
27. **RecentScans.tsx** - Recent scan list
28. **ReportsPage.tsx** - All reports archive page
29. **FixCard.tsx** - Recommendation cards
30. **ComingSoonNotice.tsx** - Feature coming soon banner
31. **PublicScanWarning.tsx** - Warning for public scans
32. **RateLimitBanner.tsx** - Rate limit notification
33. **EnhancedExpandControls.tsx** - Expand/collapse controls
34. **ProfessionalBadge.tsx** - Pro user badge
35. **AboutCredits.tsx** - About page credits section
36. **ErrorBoundary.tsx** - Error handling component

**Additional Pages** (beyond 36 components):
- About.tsx
- Compare.tsx
- Dashboard.tsx
- Docs.tsx
- NotFound.tsx
- Scan.tsx
- GradingDemo.tsx

---

## Design Requirements

### 1. Background Video Integration

**Critical Question**: How should video appear across all pages?

**Considerations**:
- **Home Page**: Can video be lighter/more visible? Hero section focal point?
- **Report Page**: Needs darker overlay for readability of dense information?
- **Other Pages**: Consistent approach or page-specific?

**Recommended Strategy Options**:

**Option A: Fixed Gradient Overlay (Safest)**
```
Video → Dark gradient overlay (black/10 top → black/70 bottom) → Content
Opacity: 0.3-0.4 for video
Result: Subtle motion, guaranteed readability
```

**Option B: Dynamic Overlay by Page Type**
```
Home page: Lighter overlay (video more visible)
Report page: Darker overlay (readability priority)
Other pages: Medium overlay
```

**Option C: Parallax Subtle Effect**
```
Video fixed position, content scrolls over with dark overlay
Subtle depth effect without distraction
```

**Your Task**: Choose strategy and document:
- Video opacity values (0.0-1.0)
- Overlay gradient values (e.g., `bg-gradient-to-b from-black/20 to-black/80`)
- Poster image strategy (first frame extraction)
- Mobile behavior (same video or static poster?)

### 2. Color Palette for Dark Mode

**Design these palettes** (provide hex codes + Tailwind classes):

**Dark Backgrounds**:
- Primary surface: Pure black `#000000` or deep slate `#0f172a`?
- Elevated surface (cards): Slightly lighter?
- Borders: Subtle outlines (not too bright)

**Text Colors**:
- Headings: Pure white `#ffffff` or off-white `#f8fafc`?
- Body text: Light gray (high contrast but not harsh)
- Muted text: Gray-400 or similar

**Advisor Green Adjustments**:
- Keep `#10b981` or brighten for dark backgrounds?
- Hover states?
- Focus states?

**Privacy Score Colors (Brightened)**:
- Safe: Brighter green (still recognizable)
- Caution: Brighter amber (maintain WCAG AA contrast)
- Danger: Brighter red (maintain WCAG AA contrast)

**Severity Indicators**:
- Low: Dark background with light text
- Medium: Amber tones (adjusted for dark)
- High: Red tones (adjusted for dark)

**Example Format**:
```
gecko-dark-surface: #0f172a (slate-900)
gecko-dark-elevated: #1e293b (slate-800)
gecko-dark-border: #334155 (slate-700)
gecko-dark-text-primary: #f8fafc (slate-50)
gecko-dark-text-body: #cbd5e1 (slate-300)
gecko-dark-text-muted: #94a3b8 (slate-400)
advisor-dark-primary: #22c55e (green-500, brightened)
privacy-safe-dark: #22c55e
privacy-caution-dark: #fbbf24
privacy-danger-dark: #f87171
```

### 3. Glass Morphism Strategy

**Where to use glass effects**:
- Header navigation bar?
- Cards (elevated over video)?
- Modals (floating over content)?
- Tooltips/popovers?

**Glass morphism specs**:
- Background: `bg-slate-900/80` (translucent)
- Backdrop blur: `backdrop-blur-md` or `backdrop-blur-lg`?
- Border: `border border-slate-700/50` (subtle outline)
- Shadow: `shadow-2xl shadow-black/50` (depth)

**Example Card**:
```css
bg-slate-900/80
backdrop-blur-lg
border border-slate-700/50
rounded-xl
shadow-2xl shadow-black/50
```

**Your Task**: Define which components get glass effects and specify exact Tailwind classes.

### 4. Typography Adjustments

**Dark mode requires different weights/spacing**:

**Headings**:
- Font weight: Bold (700) sufficient or need extrabold (800)?
- Letter spacing: `tracking-tight` or normal?
- Text color: Pure white or off-white?
- Text shadow: None or subtle glow? `text-shadow: 0 0 20px rgba(255,255,255,0.1)`?

**Body Text**:
- Font weight: Regular (400) or medium (500)?
- Line height: Maintain current `leading-relaxed` or tighten?
- Color: Light gray (specify hex)

**Small Text**:
- Timestamp, metadata, help text
- Ensure WCAG AA contrast (4.5:1 minimum)

**Your Task**: Provide font weight, size, spacing, and color recommendations for:
- h1 (hero headlines)
- h2 (section titles)
- h3 (card headers)
- body (paragraphs)
- small (metadata)
- links (hover states)

### 5. Component-Specific Design

#### ScoreDial (Most Important)
- Current: Circular gauge with color-coded arc
- Dark theme: How to make it pop over video background?
  - Glass morphism card container?
  - Stronger glow effects?
  - Brighter colors?
  - Drop shadow or neon outline?
- Provide mockup or detailed specs

#### Header Navigation
- Current: White background, border-bottom
- Dark theme options:
  - Glass morphism with backdrop blur?
  - Solid dark background?
  - Floating/detached from top?
- Mobile hamburger menu styling?
- Active link indicator (underline or background)?

#### Cards (Used Everywhere)
- Current: White bg, gray border, shadow
- Dark theme:
  - Glass morphism with translucent background?
  - Solid dark surface with subtle border?
  - Elevated shadow for depth?
- Hover effect: Lift, glow, border color change?

#### Buttons
- Primary (Advisor Green): Keep color or adjust?
- Hover states: Brighter or add glow?
- Focus states: Outline or shadow?
- Disabled states: How to indicate?

#### Privacy Score Components
- GradeBadge (A-F letter grades): Color scheme for dark mode?
- SeverityBadge (Low/Medium/High): Background and text colors?
- TrustBadge: Icons and colors?

### 6. Animation & Transition Strategy

**Principles**:
- Smooth, subtle, purposeful (no unnecessary motion)
- Respect `prefers-reduced-motion`
- Performance (GPU-accelerated properties only)

**Hover Effects**:
- Cards: Lift (`hover:-translate-y-1`)? Glow? Border color?
- Buttons: Scale (`hover:scale-105`)? Shadow increase?
- Links: Underline? Color change? Glow?

**Loading States**:
- ScanProgress: Animated spinner or progress bar?
- Skeleton screens: Pulse or shimmer effect?
- ProgressDial: Smooth arc animation?

**Page Transitions**:
- Fade in on load? (`animate-fade-in`)
- Stagger children? (cards appear sequentially)
- Scroll animations? (reveal on scroll)

**Video Fade-In**:
- Video loads gradually? (`opacity-0` → `opacity-100` over 1s)
- Or instant display with poster fallback?

**Your Task**: Specify transition durations, easing functions, and effects for:
- Hover states (cards, buttons, links)
- Focus states (keyboard navigation)
- Loading states (spinners, skeletons)
- Page load (initial fade-in)
- Video appearance

### 7. Accessibility Requirements (WCAG AA)

**Contrast Ratios**:
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

**Verify these combinations**:
- Text on dark backgrounds over video
- Privacy score colors (green, amber, red) on dark surfaces
- Button text on Advisor Green
- Links on various backgrounds
- Severity badge text/background combinations

**Focus Indicators**:
- Visible in dark mode (2px outline minimum)
- Color: Advisor Green or white?
- Sufficient contrast from background

**Color-Blind Simulation**:
- Privacy scores still distinguishable without color?
- Use patterns, shapes, or labels in addition to color?

**Your Task**: Run contrast checks and provide WCAG AA compliance report for all text/background combinations.

---

## Deliverables

### Required Outputs

**1. Complete Color Palette Document**
```
Dark Theme Color System

Surfaces:
- Primary surface: #0f172a (slate-900)
- Elevated surface: #1e293b (slate-800)
- Borders: #334155 (slate-700)
- ...

Typography:
- Headings: #f8fafc (slate-50)
- Body: #cbd5e1 (slate-300)
- ...

Brand Colors:
- Advisor Green (adjusted): #22c55e
- Privacy Safe (dark): #22c55e
- ...

Glass Effects:
- Background: bg-slate-900/80
- Backdrop: backdrop-blur-lg
- ...
```

**2. Component Mockups (Minimum)**
Provide visual mockups or detailed specifications for:
- Home page (full layout with video background)
- Report page (report header + evidence section)
- Header navigation (desktop + mobile)
- ScoreDial (circular gauge with dark styling)
- Card component (standard elevated card)
- Button variants (primary, secondary, disabled)
- Privacy badges (Grade, Severity, Trust)

**3. Background Video Integration Strategy**
Document:
- Video opacity value (e.g., 0.3)
- Overlay gradient CSS (e.g., `bg-gradient-to-b from-black/20 to-black/70`)
- Poster image approach (extracted frame or custom design)
- Mobile strategy (video or static image)
- Parallax effect (if applicable)
- Performance considerations

**4. Typography Scale**
Specify for each text level:
- Font size (rem or px)
- Font weight (400, 500, 600, 700)
- Line height (e.g., 1.5, 1.75)
- Letter spacing (e.g., -0.02em)
- Color (hex + Tailwind class)
- Text shadow (if any)

Example:
```
h1 (Hero):
- Size: 3rem (48px)
- Weight: 700 (bold)
- Line height: 1.2
- Color: #ffffff (white)
- Shadow: 0 0 40px rgba(16,185,129,0.3)

h2 (Section):
- Size: 2rem (32px)
- Weight: 700
- Line height: 1.3
- Color: #f8fafc (slate-50)
- Shadow: none
```

**5. Animation & Transition Specifications**
For each interaction type:
- Property animated (transform, opacity, shadow)
- Duration (ms)
- Easing function (ease-in-out, cubic-bezier)
- Hover/focus/active states

Example:
```
Card Hover:
- Transform: translateY(-4px)
- Shadow: shadow-lg → shadow-2xl
- Duration: 200ms
- Easing: ease-out

Button Hover:
- Background: advisor-600 → advisor-700
- Scale: 1 → 1.02
- Shadow: shadow-md → shadow-lg
- Duration: 150ms
- Easing: ease-in-out
```

**6. Accessibility Compliance Report**
- Contrast ratio verification (text/background pairs)
- Focus indicator specifications
- Color-blind friendly confirmation
- Keyboard navigation considerations

**7. Mobile vs. Desktop Design Variations**
- Breakpoint-specific styles (sm, md, lg, xl)
- Video behavior on mobile
- Touch target sizes (minimum 44px)
- Mobile menu styling

---

## Design Constraints

### Must Preserve
- **Gecko Advisor Brand Identity**: Logo, green accent color (adjusted for dark)
- **Privacy Score System**: Green (safe), Amber (caution), Red (danger) with grades A-F
- **"100% Free, No Account Required"**: Clear messaging throughout
- **Accessibility**: WCAG AA compliance non-negotiable
- **Performance**: LCP <2.5s, no jank from video

### Must Avoid
- **Overly Bright Colors**: Harsh whites, neon accents (exception: subtle glows)
- **Excessive Animation**: No gratuitous motion, respect prefers-reduced-motion
- **Poor Readability**: All text must be clearly readable over video
- **Heavy Visual Elements**: Keep design clean, not cluttered
- **Breaking Changes**: Design must work with existing component structure

### Flexibility
- **Glass Morphism Intensity**: Adjust blur and opacity as needed
- **Color Brightness**: Fine-tune colors for perfect readability
- **Spacing**: Adjust padding/margins for visual balance
- **Animation Speed**: Tune durations for feel

---

## Reference Materials

### Inspiration (Modern Minimalist Dark Themes)
- Apple.com (minimal dark mode with high contrast)
- Vercel.com (clean dark mode with subtle accents)
- GitHub.com (readable dark mode for content)
- Linear.app (modern dark UI with glass effects)
- Stripe.com (professional dark mode)

### Current Gecko Advisor Live Site
- URL: https://geckoadvisor.com (light theme)
- URL: https://stage.geckoadvisor.com (preprod - light theme currently)

### Technical Stack
- React 18 + TypeScript
- Tailwind CSS 3.x
- Vite build tool
- No CSS-in-JS (pure Tailwind classes)

---

## Success Criteria

Your design system will be considered successful if:

1. **Visual Quality**: Professional, modern, minimalist aesthetic achieved
2. **Readability**: All content clearly readable over video background
3. **Brand Consistency**: Gecko Advisor identity preserved and enhanced
4. **Accessibility**: WCAG AA compliance verified
5. **Performance**: Design choices don't hinder performance (e.g., no excessive blur)
6. **Implementability**: Specifications clear enough for frontend-specialist to implement
7. **User Approval**: User confirms design matches their vision

---

## Timeline & Process

**Estimated Duration**: 3-5 days (no rush)

**Process**:
1. **Day 1-2**: Explore color palettes, video integration strategy, component styling
2. **Day 3-4**: Create mockups, refine based on internal review
3. **Day 5**: Document complete design system, prepare deliverables
4. **Review Gate**: User reviews and approves before implementation begins

**Communication**:
- You'll deliver design system document + mockups
- User reviews and provides feedback
- Iterate if needed (1-2 rounds expected)
- Final approval triggers implementation phase

---

## Questions to Answer

As you design, answer these key questions explicitly:

1. **Video Background**:
   - What opacity for the video? (0.0-1.0)
   - What gradient overlay? (CSS values)
   - Same across all pages or page-specific?
   - Static or subtle parallax?

2. **Surface Colors**:
   - Pure black `#000000` or deep slate `#0f172a` for primary surface?
   - How much lighter for elevated cards?
   - Border color and thickness?

3. **Text Colors**:
   - Pure white or off-white for headings?
   - Which gray for body text? (ensure 4.5:1 contrast)
   - Link color and hover state?

4. **Glass Morphism**:
   - Which components get glass effects?
   - Blur intensity (`backdrop-blur-sm` vs `backdrop-blur-xl`)?
   - Background opacity?

5. **Privacy Colors**:
   - Keep green `#10b981` or brighten to `#22c55e`?
   - Adjust amber and red similarly?
   - Verify WCAG AA contrast on dark surfaces?

6. **Animations**:
   - Hover effect for cards? (lift, glow, border?)
   - Button hover? (scale, shadow, brightness?)
   - Video fade-in? (instant or gradual?)

7. **Mobile**:
   - Show video on mobile or static poster?
   - Different overlay opacity for small screens?
   - Touch targets 44px minimum?

---

## Contact & Support

**Primary User**: @pothamsettyk
**Project Repository**: ItsAnonA/gecko-advisor (fork)
**Branch**: preprod
**Environment**: stage.geckoadvisor.com

**Rollback Plan**: Documented in `/Users/pothamsettyk/Projects/Privacy-Advisor/ROLLBACK_PROCEDURE.md`

**Backup**: Local branch `preprod-backup-pre-dark-theme` and tag `v-preprod-light-theme` created

---

**Ready to Design?**

Take your time, explore options, and create a comprehensive design system that blends modern aesthetics with minimalist readability. The goal is a dark theme that feels cutting-edge yet professional, perfect for privacy-conscious users who value both form and function.

**Deliver**:
- Complete color palette document
- Component mockups (Home, Report, Header, ScoreDial, Cards, Buttons, Badges)
- Background video integration strategy
- Typography scale and weights
- Animation/transition specifications
- Accessibility compliance report
- Mobile design variations

**Expected Return**: 3-5 days with comprehensive design system ready for user review.

---

**Version**: 1.0
**Date**: November 20, 2025
**Status**: Active - Awaiting Design System Delivery
