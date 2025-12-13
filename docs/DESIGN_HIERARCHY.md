# Design Hierarchy - Gecko Advisor Reports Page

This document defines the semantic visual hierarchy for the Reports page, guiding all design decisions to ensure users understand privacy status at a glance.

---

## Visual Attention Levels

### PRIMARY (3-Second Glance)

What users must understand instantly:

| Element | Purpose | Visual Treatment |
|---------|---------|------------------|
| **Score Number** | Privacy health at a glance | Largest text, bold, animated count-up |
| **Risk Label** | Semantic categorization | Colored badge, uppercase, high contrast |
| **Domain Name** | What site this is about | Monospace font, prominent placement |

**Design Rules:**
- Score uses Space Grotesk display font at 48-60px
- Risk label has colored background matching risk level
- Domain uses JetBrains Mono for technical credibility

---

### SECONDARY (10-Second Scan)

Evidence that supports the score:

| Element | Purpose | Visual Treatment |
|---------|---------|------------------|
| **Tracker Count** | Quantified surveillance exposure | Number + label, icon pairing |
| **Third Parties** | Data sharing breadth | Number + label, icon pairing |
| **TLS Grade** | Connection security | Letter grade badge (A/B/C/D/F) |
| **Security Gaps** | Missing protections | Count with severity indicator |

**Design Rules:**
- Metrics displayed in horizontal summary card
- Each metric has icon + number + label
- Color coding matches severity (green/amber/red)

---

### TERTIARY (Deep Dive)

Detailed findings for thorough review:

| Element | Purpose | Visual Treatment |
|---------|---------|------------------|
| **Tab Content** | Category-specific evidence | Progressive disclosure via tabs |
| **Individual Findings** | Specific issues/risks | Collapsible cards with severity |
| **Technical Details** | Raw data for experts | Monospace code blocks, expandable |
| **Recommendations** | Actionable fixes | Numbered list with external links |

**Design Rules:**
- Default state: collapsed/hidden
- User must click to expand
- Lower visual prominence than score/metrics

---

### FADE TO BACKGROUND

Elements that shouldn't compete for attention:

| Element | Visual Treatment |
|---------|------------------|
| Navigation | Minimal, subtle colors |
| Share Buttons | Icon-only, gray until hover |
| Footer | Small text, muted colors |
| Branding | Logo only, not competing |
| "How it works" | Collapsed by default |
| Attribution | Tiny text, bottom of page |

**Design Rules:**
- Use gray/muted color palette
- Smaller font sizes
- Low contrast ratios (within accessibility limits)
- No animations or visual flourishes

---

## Interrupt Patterns

When should design draw extra attention?

### DO Interrupt For:
- **Critical Risk Scores (0-39)**: Red glow on hero card, prominent warning
- **High Severity Findings**: Red border, expanded by default
- **TLS Grade F**: Badge pulses or has warning icon

### DO NOT Interrupt For:
- Every warning (causes alert fatigue)
- Medium severity findings
- Informational notices
- Cookie consent detection

---

## Color System

### Risk Level Colors (CSS Variables)

```css
:root {
  --risk-low: #16A34A;        /* Green - Safe */
  --risk-moderate: #F59E0B;   /* Amber - Caution */
  --risk-high: #EF4444;       /* Red - Danger */
  --risk-critical: #991B1B;   /* Dark Red - Critical */

  --risk-bg-low: #F0FDF4;
  --risk-bg-moderate: #FFFBEB;
  --risk-bg-high: #FEF2F2;
  --risk-bg-critical: #FEF2F2;
}
```

### Usage Guidelines

| Risk Level | Score Range | Ring Color | Glow | Background |
|------------|-------------|------------|------|------------|
| Low | 70-100 | --risk-low | Subtle green | --risk-bg-low |
| Moderate | 40-69 | --risk-moderate | Subtle amber | --risk-bg-moderate |
| High | 0-39 | --risk-high | Visible red | --risk-bg-high |
| Critical | Special | --risk-critical | Strong red | --risk-bg-critical |

---

## Typography Hierarchy

| Level | Font | Weight | Size | Use Case |
|-------|------|--------|------|----------|
| Display | Space Grotesk | 700 | 48-60px | Score number |
| Heading 1 | Space Grotesk | 700 | 24-32px | Domain name |
| Heading 2 | Space Grotesk | 600 | 18-20px | Section titles |
| Body | DM Sans | 400-500 | 14-16px | Descriptions, prose |
| Technical | JetBrains Mono | 400-500 | 12-14px | URLs, domains, code |
| Caption | DM Sans | 400 | 12px | Attribution, timestamps |

---

## Animation Principles

### On Page Load
1. **Hero Section**: Fade in + slide up (0ms delay)
2. **SEO Summary**: Fade in + slide up (100ms delay)
3. **Tab Navigation**: Fade in + slide up (200ms delay)
4. **Tab Content**: Fade in + slide up (300ms delay)

### Score Dial Animation
1. Ring draws from 0 to target (1.5s ease-out)
2. Score number counts up (0.4s delay, 0.8s duration)
3. Glow effect fades in with ring

### Interaction Animations
- **Card Hover**: translateY(-2px) + enhanced shadow
- **Tab Hover**: subtle background color change
- **Button Hover**: color shift, no movement

### Accessibility
All animations respect `prefers-reduced-motion: reduce`:
- Animations disabled
- Opacity set to 1 immediately
- Transforms set to final state

---

## Summary

**The score is the hero.** Everything else supports understanding why that score exists and what can be done about it. Design decisions should always ask: "Does this help or distract from the score?"
