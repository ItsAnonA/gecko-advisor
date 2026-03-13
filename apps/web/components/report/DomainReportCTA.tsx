/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';
import { SampleRequestForm } from '@/components/conversion/SampleRequestForm';

interface DomainReportCTAProps {
  domain: string;
}

export function DomainReportCTA({ domain }: DomainReportCTAProps) {
  const monitorSubject = encodeURIComponent(`Privacy alerts for ${domain}`);
  const monitorBody = encodeURIComponent(
    `I'd like to receive privacy change alerts for ${domain}.\n\nPlease add me to the monitoring list.`
  );

  return (
    <div className="mt-12 space-y-10">
      {/* Section A: Next Steps Ladder */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 font-display">
          What to do next
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={`/compare/${domain}/`}
            className="group flex items-start gap-3 p-4 rounded-lg border border-zinc-200 bg-white hover:border-advisor-300 hover:shadow-sm transition-all"
          >
            <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-md bg-advisor-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-advisor-600 transition-colors">
                Compare with competitors
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                See how {domain} stacks up against another domain side-by-side.
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="group flex items-start gap-3 p-4 rounded-lg border border-zinc-200 bg-white hover:border-advisor-300 hover:shadow-sm transition-all"
          >
            <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-md bg-advisor-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-advisor-600 transition-colors">
                Scan another domain
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Run a free privacy scan on any website in seconds.
              </p>
            </div>
          </Link>

          <a
            href={`mailto:alerts@geckoadvisor.com?subject=${monitorSubject}&body=${monitorBody}`}
            className="group flex items-start gap-3 p-4 rounded-lg border border-zinc-200 bg-white hover:border-advisor-300 hover:shadow-sm transition-all"
          >
            <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-md bg-advisor-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-advisor-600 transition-colors">
                Monitor this domain
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Get alerted when {domain} changes its privacy practices.
              </p>
            </div>
          </a>

          <Link
            href="/api-access"
            className="group flex items-start gap-3 p-4 rounded-lg border border-zinc-200 bg-white hover:border-advisor-300 hover:shadow-sm transition-all"
          >
            <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-md bg-advisor-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-advisor-600 transition-colors">
                Use the API to check vendors
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Programmatic access for compliance and vendor risk workflows.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Section B: API Upsell Block */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 md:p-8">
        <div className="md:flex md:items-center md:justify-between md:gap-8">
          <div className="mb-5 md:mb-0">
            <h2 className="text-lg font-semibold text-white font-display mb-2">
              Need to check multiple vendors?
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
              The Domain Intelligence API returns this data programmatically.
              Scan thousands of domains. Get JSON responses in seconds.
            </p>
          </div>
          <Link
            href="/api-access"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-advisor-500 text-white font-medium text-sm hover:bg-advisor-600 transition-colors whitespace-nowrap flex-shrink-0"
          >
            Try API
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Section C: Sample Request Form */}
      <section>
        <SampleRequestForm defaultDomain={domain} />
      </section>

      {/* Original Resource Links */}
      <section className="border-t border-zinc-200 pt-8">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Domain Intelligence Resources</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/domain-intelligence-api"
            className="group p-4 rounded-lg border border-zinc-200 hover:border-advisor-300 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold text-zinc-900 text-sm mb-1 group-hover:text-advisor-600 transition-colors">
              Domain Intelligence API
            </h3>
            <p className="text-xs text-zinc-500">
              Programmatic access to privacy scores and tracker data for compliance workflows.
            </p>
          </Link>
          <Link
            href="/vendor-domain-due-diligence"
            className="group p-4 rounded-lg border border-zinc-200 hover:border-advisor-300 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold text-zinc-900 text-sm mb-1 group-hover:text-advisor-600 transition-colors">
              Vendor Due Diligence Guide
            </h3>
            <p className="text-xs text-zinc-500">
              How to screen vendor domains before onboarding with automated privacy checks.
            </p>
          </Link>
          <Link
            href="/check-domain-risk"
            className="group p-4 rounded-lg border border-zinc-200 hover:border-advisor-300 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold text-zinc-900 text-sm mb-1 group-hover:text-advisor-600 transition-colors">
              Domain Risk Checker
            </h3>
            <p className="text-xs text-zinc-500">
              Quick privacy risk lookup for any domain in our monitored database.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
