/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Third-Party Risk Management (TPRM) Guide for Domain Privacy',
  description:
    'How to build a domain privacy assessment program that scales from 10 vendors to 10,000. Covers the vendor lifecycle, risk tiering, regulatory requirements, and automation.',
  alternates: {
    canonical: 'https://geckoadvisor.com/third-party-risk-management-guide',
  },
  openGraph: {
    title: 'Third-Party Risk Management (TPRM) Guide for Domain Privacy',
    description:
      'Build a vendor privacy assessment program that scales. Covers lifecycle management, risk tiering, GDPR/CCPA requirements, and API automation.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Third-Party Risk Management (TPRM) Guide for Domain Privacy',
    description:
      'Build a vendor privacy assessment program that scales. Covers lifecycle management, risk tiering, GDPR/CCPA requirements, and API automation.',
  },
};

export default function ThirdPartyRiskManagementGuidePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li><Link href="/" className="hover:text-advisor-600 transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">Third-Party Risk Management Guide</li>
        </ol>
      </nav>

      <article className="prose prose-zinc prose-lg max-w-none">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            Third-Party Risk Management Guide
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            How to build a domain privacy assessment program that scales from 10 vendors to 10,000.
          </p>
        </header>

        {/* What Is TPRM? */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">What Is Third-Party Risk Management?</h2>
          <p className="text-zinc-700 mb-4">
            Third-Party Risk Management (TPRM) is the practice of identifying, assessing, and mitigating risks that arise from working with external vendors, suppliers, and service providers. Every organization depends on third parties -- SaaS platforms, payment processors, analytics providers, marketing tools -- and each of these relationships introduces risk.
          </p>
          <p className="text-zinc-700 mb-4">
            Most TPRM programs focus on cybersecurity risk: network vulnerabilities, data breach history, compliance certifications. But there is a critical dimension that traditional programs overlook -- <strong>domain-level privacy risk</strong>.
          </p>
          <p className="text-zinc-700 mb-4">
            When your organization integrates a vendor&apos;s services, their domain behavior becomes part of your risk surface. The trackers they load, the cookies they set, and the fingerprinting techniques they deploy all affect your users and your compliance posture. A vendor with a clean SOC 2 report can still be loading 30 advertising trackers on every page visit.
          </p>
          <p className="text-zinc-700">
            This guide covers how to build a TPRM program that incorporates domain privacy assessment as a core risk signal -- from initial vendor screening through ongoing monitoring and offboarding.
          </p>
        </section>

        {/* The 5-Stage Vendor Lifecycle */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">The 5-Stage Vendor Privacy Lifecycle</h2>
          <p className="text-zinc-700 mb-4">
            Effective TPRM is not a one-time assessment. It requires continuous attention across the full vendor relationship lifecycle.
          </p>

          <div className="space-y-6">
            <div className="p-5 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Stage 1: Pre-Contract Due Diligence</h3>
              <p className="text-zinc-700 mb-3">
                Before signing any vendor agreement, scan their domain to establish a privacy baseline. This is your opportunity to identify deal-breakers before they become contractual obligations.
              </p>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li>Scan the vendor&apos;s primary domain using the <Link href="/check-domain-risk" className="text-emerald-600 hover:text-emerald-700 underline">Domain Risk Checker</Link></li>
                <li>Review tracker count and identify any advertising network integrations</li>
                <li>Check for fingerprinting techniques that may conflict with your consent framework</li>
                <li>Evaluate security header configuration as a baseline for security hygiene</li>
                <li>Document findings and attach them to the procurement record</li>
              </ul>
            </div>

            <div className="p-5 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Stage 2: Onboarding</h3>
              <p className="text-zinc-700 mb-3">
                When a vendor passes due diligence and is approved, establish a documented privacy baseline that you can measure future changes against.
              </p>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li>Record the vendor&apos;s privacy score, tracker count, and cookie inventory at onboarding</li>
                <li>Document the vendor&apos;s fingerprinting status (present or absent)</li>
                <li>Set expectations in the contract for maintaining or improving privacy practices</li>
                <li>Define acceptable thresholds for score changes that trigger review</li>
                <li>Add the vendor domain to your monitoring schedule</li>
              </ul>
            </div>

            <div className="p-5 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Stage 3: Ongoing Monitoring</h3>
              <p className="text-zinc-700 mb-3">
                Vendor privacy practices change. New trackers get added, security headers get misconfigured, fingerprinting gets introduced. Continuous monitoring catches these changes before they become compliance issues.
              </p>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li>Schedule regular rescans (weekly for critical vendors, monthly for others)</li>
                <li>Monitor the <Link href="/changes" className="text-emerald-600 hover:text-emerald-700 underline">change feed</Link> for score changes and tracker additions</li>
                <li>Set up alerts for significant score drops (10+ points) or new fingerprinting detection</li>
                <li>Track stability scores to identify vendors with volatile privacy practices</li>
              </ul>
            </div>

            <div className="p-5 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Stage 4: Periodic Reassessment</h3>
              <p className="text-zinc-700 mb-3">
                Beyond automated monitoring, conduct structured periodic reviews that compare current privacy posture against the onboarding baseline and industry benchmarks.
              </p>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li>Quarterly reviews for critical and high-risk vendors</li>
                <li>Annual reviews for medium and low-risk vendors</li>
                <li>Compare current scores against onboarding baselines</li>
                <li>Benchmark vendor scores against <Link href="/privacy-benchmarks" className="text-emerald-600 hover:text-emerald-700 underline">industry averages</Link></li>
                <li>Escalate vendors whose scores have declined below acceptable thresholds</li>
              </ul>
            </div>

            <div className="p-5 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Stage 5: Offboarding</h3>
              <p className="text-zinc-700 mb-3">
                When a vendor relationship ends, verify that their privacy footprint has been fully removed from your environment.
              </p>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li>Verify that the vendor&apos;s tracking scripts have been removed from your properties</li>
                <li>Confirm that third-party cookies associated with the vendor are no longer being set</li>
                <li>Run a final scan to document the vendor&apos;s privacy posture at offboarding</li>
                <li>Archive the vendor&apos;s scan history for audit trail purposes</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Domain-Level Risk Assessment */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Domain-Level Risk Assessment</h2>
          <p className="text-zinc-700 mb-4">
            Traditional TPRM relies on questionnaires, certifications, and penetration test results. Domain scanning adds an objective, observable signal that reflects what a vendor actually does -- not what they claim to do in a self-assessment form.
          </p>
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Privacy Score as Risk Tier Input</h3>
              <p className="text-sm text-zinc-600">
                A vendor&apos;s privacy score (0-100) provides a quantitative risk signal that can feed directly into your risk tiering framework. Scores below 60 indicate significant privacy issues that warrant investigation. Scores above 80 suggest strong privacy practices.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Tracker Count as Data Flow Indicator</h3>
              <p className="text-sm text-zinc-600">
                The number of third-party trackers a vendor loads indicates how many external parties receive data from visitors. Each tracker represents a data flow that may require disclosure under GDPR or CCPA. High tracker counts (10+) suggest extensive data sharing with advertising and analytics networks.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Fingerprinting as Consent Risk Flag</h3>
              <p className="text-sm text-zinc-600">
                Browser fingerprinting operates without cookies, making it difficult for users to detect, block, or opt out. Vendors that deploy fingerprinting may create consent compliance risk under GDPR&apos;s ePrivacy Directive and similar regulations that require informed consent for tracking.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Security Headers as Configuration Baseline</h3>
              <p className="text-sm text-zinc-600">
                Missing or misconfigured security headers (CSP, HSTS, X-Frame-Options) indicate gaps in basic security hygiene. While not directly a privacy issue, poor security header configuration suggests that the vendor may not have robust security practices in general.
              </p>
            </div>
          </div>
        </section>

        {/* Risk Tiering Framework */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Building a Risk Tiering Framework</h2>
          <p className="text-zinc-700 mb-4">
            Not all vendors require the same level of scrutiny. A risk tiering framework helps allocate review resources proportionally to the risk each vendor presents.
          </p>
          <div className="overflow-x-auto my-8 not-prose">
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-900">Risk Tier</th>
                  <th className="text-left p-3 font-semibold text-gray-900">Privacy Score</th>
                  <th className="text-left p-3 font-semibold text-gray-900">Review Frequency</th>
                  <th className="text-left p-3 font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-red-50">
                  <td className="p-3 font-medium text-red-900">Critical</td>
                  <td className="p-3 text-red-800">Below 40</td>
                  <td className="p-3 text-red-800">Immediate review</td>
                  <td className="p-3 text-red-800">Block or require remediation plan</td>
                </tr>
                <tr className="bg-orange-50">
                  <td className="p-3 font-medium text-orange-900">High</td>
                  <td className="p-3 text-orange-800">40 - 59</td>
                  <td className="p-3 text-orange-800">Quarterly</td>
                  <td className="p-3 text-orange-800">Enhanced monitoring, remediation requested</td>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="p-3 font-medium text-yellow-900">Medium</td>
                  <td className="p-3 text-yellow-800">60 - 79</td>
                  <td className="p-3 text-yellow-800">Annually</td>
                  <td className="p-3 text-yellow-800">Standard monitoring</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="p-3 font-medium text-green-900">Low</td>
                  <td className="p-3 text-green-800">80 - 100</td>
                  <td className="p-3 text-green-800">Biennially</td>
                  <td className="p-3 text-green-800">Lightweight monitoring</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-zinc-700 mb-4">
            These thresholds are starting points. Your organization should calibrate them based on your risk appetite, regulatory environment, and the nature of data your vendors process. Vendors handling sensitive personal data (health, financial, children&apos;s data) may warrant stricter thresholds.
          </p>
          <p className="text-zinc-700">
            Beyond the privacy score, consider additional factors for tier assignment: whether the vendor deploys fingerprinting (automatic escalation to High), the number of advertising trackers (more than 5 suggests data monetization), and stability trends (declining scores over time warrant closer attention).
          </p>
        </section>

        {/* Regulatory Requirements */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Regulatory Requirements</h2>
          <p className="text-zinc-700 mb-4">
            Multiple regulatory frameworks require organizations to assess and manage third-party risk. Domain privacy assessment directly supports compliance with these requirements.
          </p>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">GDPR Article 28 -- Processor Obligations</h3>
              <p className="text-zinc-700">
                GDPR requires data controllers to use only processors that provide &ldquo;sufficient guarantees&rdquo; of implementing appropriate technical and organizational measures. Domain scanning provides observable evidence of a vendor&apos;s technical measures -- their tracker deployment, cookie practices, and security configuration are direct indicators of their data protection approach. Article 28 also requires controllers to conduct due diligence before engaging processors and to monitor compliance throughout the relationship.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">CCPA Service Provider Rules</h3>
              <p className="text-zinc-700">
                Under CCPA, businesses must contractually restrict service providers from using personal information for purposes beyond the services they provide. Domain scanning can reveal whether a vendor&apos;s website loads advertising trackers that suggest data usage beyond service provision. If a vendor&apos;s domain sets third-party advertising cookies, it raises questions about whether they are truly operating as a &ldquo;service provider&rdquo; under CCPA&apos;s definition.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">DORA ICT Third-Party Requirements</h3>
              <p className="text-zinc-700">
                The Digital Operational Resilience Act (DORA) requires financial entities to manage ICT third-party risk comprehensively, including ongoing monitoring of critical ICT service providers. Domain privacy assessment provides a continuous, automated monitoring signal that complements traditional vendor assessments. DORA&apos;s emphasis on &ldquo;proportionate&rdquo; risk management aligns well with the tiered monitoring approach described above.
              </p>
            </div>
          </div>
        </section>

        {/* Automation with API */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Automation with the Domain Intelligence API</h2>
          <p className="text-zinc-700 mb-4">
            Manual vendor screening works for 10 vendors. It does not work for 100, let alone 1,000. The <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">Gecko Advisor API</Link> enables programmatic vendor privacy assessment that integrates into existing workflows.
          </p>
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Procurement Integration</h3>
              <p className="text-sm text-zinc-600">
                Add a domain scan step to your vendor onboarding workflow. When a new vendor is submitted for approval, automatically scan their domain and include the privacy score in the approval record. Flag vendors below your threshold for manual review.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Scheduled Monitoring</h3>
              <p className="text-sm text-zinc-600">
                Set up automated rescans for all active vendor domains on a schedule that matches your risk tiers. Critical vendors scanned weekly, standard vendors monthly. Feed results into your GRC platform or risk dashboard.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Alerting and Escalation</h3>
              <p className="text-sm text-zinc-600">
                Monitor the change detection API for significant score drops, new tracker additions, or fingerprinting detection. Route alerts to the appropriate team based on vendor risk tier and the nature of the change.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Reporting and Audit</h3>
              <p className="text-sm text-zinc-600">
                Generate quarterly vendor privacy reports using API data. Show score trends, tracker changes, and compliance status across your entire vendor portfolio. Maintain an audit trail of all assessments for regulatory inspections.
              </p>
            </div>
          </div>
        </section>

        {/* Common TPRM Mistakes */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Common TPRM Mistakes</h2>
          <p className="text-zinc-700 mb-4">
            Even organizations with established vendor risk programs often fall into patterns that reduce the effectiveness of their TPRM efforts.
          </p>
          <div className="space-y-4">
            <div className="p-4 border-l-4 border-red-300 bg-red-50 rounded-r-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Relying on manual-only assessments</h3>
              <p className="text-sm text-zinc-700">
                Spreadsheet-based vendor assessments do not scale and quickly become outdated. By the time you finish reviewing 50 vendor questionnaires, the first vendor&apos;s practices may have changed. Automated domain scanning provides real-time, objective data that supplements (not replaces) manual review.
              </p>
            </div>
            <div className="p-4 border-l-4 border-red-300 bg-red-50 rounded-r-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Conducting annual-only reviews</h3>
              <p className="text-sm text-zinc-700">
                Vendor privacy practices change frequently. A vendor scanned in January may add fingerprinting in March, load new advertising trackers in June, and misconfigure their security headers in September. Annual reviews miss these changes entirely. Continuous monitoring catches problems when they appear, not 11 months later.
              </p>
            </div>
            <div className="p-4 border-l-4 border-red-300 bg-red-50 rounded-r-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Ignoring privacy signals</h3>
              <p className="text-sm text-zinc-700">
                Many TPRM programs assess cybersecurity risk (network vulnerabilities, patch management, breach history) without evaluating privacy risk (trackers, cookies, fingerprinting). A vendor can have excellent network security while simultaneously deploying invasive tracking on their website. Privacy risk is a distinct dimension that requires its own assessment methodology.
              </p>
            </div>
            <div className="p-4 border-l-4 border-red-300 bg-red-50 rounded-r-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">No baseline documentation</h3>
              <p className="text-sm text-zinc-700">
                Without documenting a vendor&apos;s privacy posture at onboarding, you have no reference point for evaluating changes. Was the vendor always loading 15 trackers, or did they add 10 since you onboarded them? Baseline documentation is essential for meaningful change detection and for demonstrating due diligence to regulators.
              </p>
            </div>
            <div className="p-4 border-l-4 border-red-300 bg-red-50 rounded-r-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Treating all vendors equally</h3>
              <p className="text-sm text-zinc-700">
                A marketing analytics vendor and a healthcare data processor present fundamentally different risk profiles. Applying the same review cadence and acceptance criteria to all vendors wastes resources on low-risk vendors while under-scrutinizing high-risk ones. Risk tiering ensures that assessment depth matches vendor criticality.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">What is TPRM?</h3>
              <p className="text-zinc-700">
                Third-Party Risk Management (TPRM) is the practice of identifying, assessing, monitoring, and mitigating risks that arise from an organization&apos;s relationships with external vendors, suppliers, and service providers. It encompasses cybersecurity risk, operational risk, compliance risk, financial risk, and -- increasingly -- privacy risk. A mature TPRM program covers the full vendor lifecycle from pre-contract due diligence through offboarding.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">How often should I reassess vendors?</h3>
              <p className="text-zinc-700">
                Assessment frequency should match vendor risk tier. Critical risk vendors (privacy score below 40 or handling sensitive data) warrant weekly automated scanning and quarterly manual review. High risk vendors should be scanned monthly with quarterly reviews. Medium risk vendors need monthly scans and annual reviews. Low risk vendors can be assessed quarterly with biennial manual reviews. Any vendor that shows a significant score change should trigger an immediate reassessment regardless of schedule.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">What privacy signals matter most?</h3>
              <p className="text-zinc-700">
                The most significant privacy risk signals from domain scanning are: (1) fingerprinting detection, which indicates tracking that bypasses consent mechanisms; (2) third-party advertising trackers, which indicate data sharing with ad networks; (3) third-party cookie count, which indicates the breadth of cross-site tracking; and (4) missing security headers, which indicate gaps in basic security configuration. A vendor deploying fingerprinting alongside advertising trackers presents substantially more privacy risk than a vendor with only first-party analytics.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">How do I automate vendor screening?</h3>
              <p className="text-zinc-700">
                The <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">Gecko Advisor API</Link> provides programmatic access to domain privacy data. Integrate it into your procurement workflow to automatically scan vendor domains during onboarding, schedule recurring assessments through the scan API, monitor the change detection endpoint for privacy regressions, and feed results into your GRC platform or risk dashboard. The API returns structured JSON with privacy scores, evidence details, and historical data suitable for automated processing.
              </p>
            </div>
          </div>
        </section>

        {/* Cross-links */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Related Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
            <Link href="/vendor-domain-due-diligence" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Vendor Due Diligence Guide</h3>
              <p className="text-sm text-zinc-600">Step-by-step guide to screening vendor domains before onboarding.</p>
            </Link>
            <Link href="/check-domain-risk" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Domain Risk Checker</h3>
              <p className="text-sm text-zinc-600">Instantly check the privacy risk of any vendor domain.</p>
            </Link>
            <Link href="/api-access" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Domain Intelligence API</h3>
              <p className="text-sm text-zinc-600">Automate vendor screening with programmatic API access.</p>
            </Link>
            <Link href="/technologies" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Tracking Technologies</h3>
              <p className="text-sm text-zinc-600">Browse tracker profiles and understand their privacy impact.</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <footer className="not-prose mt-12 rounded-xl bg-zinc-900 p-8 text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-3">Start screening vendor domains</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Build your TPRM program on observable evidence. Scan vendor domains for trackers, cookies, fingerprinting, and security configuration in seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
            >
              Scan a Website
            </Link>
            <Link
              href="/api-access"
              className="inline-flex items-center px-6 py-3 rounded-lg border border-zinc-600 text-zinc-300 font-semibold hover:bg-zinc-800 transition-colors"
            >
              API Access
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
