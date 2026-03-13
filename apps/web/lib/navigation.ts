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
      { label: 'Domain Intelligence API', href: '/api-access' },
      { label: 'Domain Risk Checker', href: '/check-domain-risk' },
      { label: 'Privacy Scanner', href: '/privacy-scanner' },
      { label: 'API Dashboard', href: '/api-access/dashboard' },
    ],
  },
  {
    label: 'Solutions',
    items: [
      { label: 'Vendor Due Diligence', href: '/vendor-domain-due-diligence' },
      { label: 'Domain Privacy Risk', href: '/domain-privacy-risk' },
      { label: 'Security Evaluation', href: '/how-to-evaluate-domain-security' },
      { label: 'TPRM Guide', href: '/third-party-risk-management-guide' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Privacy Rankings', href: '/privacy-index' },
      { label: 'Tracking Technologies', href: '/technologies' },
      { label: 'Research', href: '/research' },
      { label: 'Methodology', href: '/methodology' },
      { label: 'Transparency Reports', href: '/transparency-reports' },
      { label: 'Blog', href: '/blog' },
    ],
  },
];

export const ctaLink: NavItem = {
  label: 'API Access',
  href: '/api-access',
};

export const footerColumns = [
  {
    label: 'Products',
    items: [
      { label: 'Home', href: '/' },
      { label: 'Privacy Scanner', href: '/privacy-scanner' },
      { label: 'Domain Intelligence API', href: '/api-access' },
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
      { label: 'Privacy Rankings', href: '/privacy-index' },
      { label: 'Tracking Technologies', href: '/technologies' },
      { label: 'Research', href: '/research' },
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
