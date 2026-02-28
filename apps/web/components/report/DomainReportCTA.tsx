/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';

export function DomainReportCTA() {
  return (
    <section className="mt-12 border-t border-gray-200 pt-8">
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
  );
}
