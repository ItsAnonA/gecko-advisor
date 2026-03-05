/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

export interface NavItem {
  label: string;
  href: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Products',
    items: [
      { label: 'Domain Intelligence API', href: '/domain-intelligence-api' },
      { label: 'Domain Risk Checker', href: '/check-domain-risk' },
      { label: 'Privacy Scanner', href: '/privacy-scanner' },
    ],
  },
  {
    label: 'Solutions',
    items: [
      { label: 'Vendor Due Diligence', href: '/vendor-domain-due-diligence' },
      { label: 'Domain Privacy Risk', href: '/domain-privacy-risk' },
      { label: 'Security Evaluation', href: '/how-to-evaluate-domain-security' },
    ],
  },
  {
    label: 'Research',
    items: [
      { label: 'Privacy Index', href: '/privacy-index' },
      { label: 'Most Tracked Websites', href: '/most-tracked-websites' },
      { label: 'Highest Privacy Scores', href: '/websites-with-highest-privacy-score' },
      { label: 'Top 100 Privacy', href: '/top-100-websites-privacy' },
      { label: 'Tracker Directory', href: '/trackers' },
      { label: 'Research Reports', href: '/research' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Methodology', href: '/methodology' },
      { label: 'Transparency Reports', href: '/transparency-reports' },
      { label: 'Blog', href: '/blog' },
    ],
  },
];

export const ctaLink: NavItem = {
  label: 'API Access',
  href: '/domain-intelligence-api',
};

export const footerColumns = [
  {
    label: 'Products',
    items: [
      { label: 'Home', href: '/' },
      { label: 'Privacy Scanner', href: '/privacy-scanner' },
      { label: 'Domain Intelligence API', href: '/domain-intelligence-api' },
      { label: 'Domain Risk Checker', href: '/check-domain-risk' },
    ],
  },
  {
    label: 'Solutions',
    items: [
      { label: 'Vendor Due Diligence', href: '/vendor-domain-due-diligence' },
      { label: 'Domain Privacy Risk', href: '/domain-privacy-risk' },
      { label: 'Security Guide', href: '/how-to-evaluate-domain-security' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Methodology', href: '/methodology' },
      { label: 'Transparency', href: '/transparency-reports' },
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    label: 'Company',
    items: [
      { label: 'About', href: '/about' },
      { label: 'Roadmap', href: '/roadmap' },
      { label: 'Security', href: '/security' },
      { label: 'Legal', href: '/legal' },
      { label: 'GitHub', href: 'https://github.com/privacygecko/gecko-advisor' },
    ],
  },
];
