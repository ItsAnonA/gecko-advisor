/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * SEO Summary Component
 *
 * Server component that renders complete SEO-optimized content.
 * Designed to be embedded within the interactive report Overview tab.
 * Provides crawlable content for search engines while integrating with the interactive UI.
 *
 * This component contains all the SEO content that was previously in ReportContent,
 * ensuring search engines can crawl the full analysis text.
 */

import type { IndexTier, ScanDataForMetadata } from '@gecko-advisor/shared';
import { getScanFreshnessText } from '@gecko-advisor/shared';

interface Props {
  scanData: ScanDataForMetadata;
  domain: string;
  tier: IndexTier;
  heading: string;
}

export function SEOSummary({ scanData, domain, tier, heading }: Props) {
  const freshnessText = getScanFreshnessText(scanData.finishedAt);

  return (
    <article className="seo-content">
      {/* H2 - from getPageHeading() (~10 words) */}
      <h2 className="text-2xl font-display font-bold text-gecko-800 mb-3">{heading}</h2>

      {/* Freshness (~15 words) */}
      <p className="text-gecko-500 text-sm mb-3">{freshnessText}</p>

      {/* Methodology disclaimer (~20 words) */}
      <p className="text-gecko-400 text-sm mb-5 italic">
        This report reflects automated, publicly observable signals from a point-in-time scan.
        Results may vary based on your location, network conditions, or changes to the website.
      </p>

      {/* Limited tier banner (~20 words) */}
      {tier === 'limited' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
          <strong className="text-amber-800">Partial scan results.</strong>{' '}
          <span className="text-amber-700">
            Some analysis modules were not completed for this website. Security and basic
            configuration data is available below.
          </span>
        </div>
      )}

      {/* Summary Section (~60 words) */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-gecko-800 mb-2 flex items-center gap-2">
          <span className="text-emerald-500">📊</span>
          Privacy Analysis Summary
        </h3>
        <p className="text-gecko-700 mb-2">
          Gecko Advisor&apos;s automated analysis of <strong>{domain}</strong> resulted in a privacy
          score of <strong>{scanData.score}/100</strong>.
          {typeof scanData.score === 'number' && scanData.score >= 70
            ? ' This score indicates lower tracking activity was detected during this scan.'
            : ' This score indicates tracking activity was detected during this scan. Review the detailed findings below.'}
        </p>
        <p className="text-gecko-600 text-sm">
          Privacy scores are calculated based on detected tracking scripts, third-party
          connections, cookie usage, and security configuration. Higher scores indicate fewer
          observable privacy concerns.
        </p>
      </section>

      {/* Tracker Analysis - full tier only (~80 words) */}
      {tier === 'full' && typeof scanData.trackerCount === 'number' && (
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gecko-800 mb-2 flex items-center gap-2">
            <span className="text-amber-500">👁️</span>
            Does {domain} track you?
          </h3>
          <p className="text-gecko-700 mb-2">
            {scanData.trackerCount === 0
              ? `No tracking scripts were detected on ${domain} during this scan. Common analytics tools such as Google Analytics, Facebook Pixel, and advertising trackers were not identified in the page source or network requests.`
              : `Gecko Advisor detected ${scanData.trackerCount} tracking ${scanData.trackerCount === 1 ? 'script' : 'scripts'} on ${domain} during this scan. These may include analytics platforms, advertising networks, or behavioral tracking technologies that collect data about your browsing activity.`}
          </p>
          <p className="text-gecko-600 text-sm">
            Tracking scripts can collect information about your device, browsing behavior, and
            interactions with the website. Some tracking is used for legitimate analytics purposes,
            while other tracking may be used for advertising or cross-site profiling.
          </p>
        </section>
      )}

      {/* Third-party Analysis - full tier only (~80 words) */}
      {tier === 'full' && typeof scanData.thirdPartyCount === 'number' && (
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gecko-800 mb-2 flex items-center gap-2">
            <span className="text-blue-500">🔗</span>
            Who does {domain} share data with?
          </h3>
          <p className="text-gecko-700 mb-2">
            {scanData.thirdPartyCount === 0
              ? `No third-party requests were observed from ${domain} during this scan. When we loaded the page, your browser did not connect to external services, CDNs, or third-party domains beyond the main website.`
              : `When loading ${domain}, Gecko Advisor detected connections to ${scanData.thirdPartyCount} third-party ${scanData.thirdPartyCount === 1 ? 'service' : 'services'} during this scan. These external connections may include content delivery networks, analytics providers, advertising platforms, or embedded content from other websites.`}
          </p>
          <p className="text-gecko-600 text-sm">
            Third-party connections allow external services to potentially track your visit to this
            website. Each connection represents data being shared outside the primary domain you
            intended to visit.
          </p>
        </section>
      )}

      {/* Security Analysis - always shown (~70 words) */}
      {scanData.tlsGrade && (
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gecko-800 mb-2 flex items-center gap-2">
            <span className="text-green-500">🔒</span>
            Is {domain} secure?
          </h3>
          <p className="text-gecko-700 mb-2">
            {domain} uses <strong>TLS Grade {scanData.tlsGrade}</strong> encryption based on Gecko
            Advisor&apos;s security scan.
            {scanData.tlsGrade === 'A' || scanData.tlsGrade === 'A+'
              ? " This indicates the website uses current encryption protocols and secure configuration. Your connection to this site is encrypted using modern standards."
              : ` This grade suggests there may be room for improvement in the website's encryption configuration. While the connection is encrypted, some security headers or protocol settings could be strengthened.`}
          </p>
          <p className="text-gecko-600 text-sm">
            TLS (Transport Layer Security) encrypts data transmitted between your browser and the
            website. A higher grade indicates stronger encryption and better security configuration.
          </p>
        </section>
      )}

      {/* How to Interpret Section - ALWAYS PRESENT (~80 words) */}
      <section className="mb-4">
        <h3 className="text-lg font-semibold text-gecko-800 mb-2 flex items-center gap-2">
          <span className="text-purple-500">📖</span>
          How to interpret this report
        </h3>
        <p className="text-gecko-700 mb-2">
          Gecko Advisor analyzes publicly observable signals to assess website privacy practices.
          Our automated scanner checks for tracking scripts, third-party connections, cookies, and
          security configuration. This analysis represents a snapshot of the website at the time of
          our scan.
        </p>
        <p className="text-gecko-600 text-sm">
          Privacy scores are relative measures based on detected signals. A higher score suggests
          fewer observable privacy concerns, but does not guarantee the website&apos;s privacy policy or
          data handling practices. We recommend reviewing the website&apos;s privacy policy for complete
          information about how your data may be collected and used.
        </p>
      </section>
    </article>
  );
}
