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
import type { ReportData } from '@/lib/api';

type TopFix = NonNullable<ReportData['topFixes']>[number];

interface Props {
  scanData: ScanDataForMetadata;
  domain: string;
  tier: IndexTier;
  heading: string;
  /** Optional benchmark data for market comparison SEO content */
  benchmarks?: ReportData['meta'];
  /** Optional remediation recommendations for SEO content */
  topFixes?: TopFix[];
}

export function SEOSummary({ scanData, domain, tier, heading, benchmarks, topFixes }: Props) {
  const freshnessText = getScanFreshnessText(scanData.finishedAt);

  // Helper to get human-readable category name
  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'tracking': return 'tracking concern';
      case 'security': return 'security issue';
      case 'compliance': return 'compliance gap';
      default: return 'privacy issue';
    }
  };

  // Helper to get priority text based on severity
  const getPriorityText = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'critical priority';
      case 'high': return 'high priority';
      case 'medium': return 'medium priority';
      default: return 'recommended';
    }
  };

  // Minimum sample size for showing market comparison - below this, hide entirely
  const MIN_SAMPLE_FOR_COMPARISON = 50;

  // Extract benchmark data if available - ONLY show comparisons when N >= 50
  const totalDomains = benchmarks?.globalBenchmarks?.totalDomains ?? 0;
  const showComparisons = benchmarks?.benchmarks && benchmarks?.globalBenchmarks && totalDomains >= MIN_SAMPLE_FOR_COMPARISON;
  const percentile = benchmarks?.benchmarks?.percentile;
  const averageScore = benchmarks?.globalBenchmarks?.averageScore;
  const averageTrackerCount = benchmarks?.globalBenchmarks?.averageTrackerCount;

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
          {typeof scanData.trackerCount === 'number' && scanData.trackerCount === 0
            ? ' No tracking scripts were detected during this scan.'
            : typeof scanData.trackerCount === 'number'
            ? ` ${scanData.trackerCount} tracking ${scanData.trackerCount === 1 ? 'script was' : 'scripts were'} detected during this scan.`
            : ''}
        </p>
        <p className="text-gecko-600 text-sm">
          Privacy scores are calculated based on detected tracking scripts, third-party
          connections, cookie usage, and security configuration. Higher scores indicate fewer
          observable privacy concerns.
        </p>
      </section>

      {/* Market Comparison Section - SEO enrichment (~80 words) - ONLY when N >= 50 */}
      {showComparisons && typeof percentile === 'number' && (
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gecko-800 mb-2 flex items-center gap-2">
            <span className="text-indigo-500">📈</span>
            How does {domain} compare to other websites?
          </h3>
          <p className="text-gecko-700 mb-2">
            Based on Gecko Advisor&apos;s analysis of <strong>{totalDomains?.toLocaleString()}</strong> websites,{' '}
            <strong>{domain}</strong> scores better than <strong>{percentile}%</strong> of all sites we&apos;ve analyzed.
            {typeof scanData.score === 'number' && typeof averageScore === 'number' && (
              scanData.score >= averageScore
                ? ` This is ${scanData.score - averageScore} points above the average score of ${averageScore}.`
                : ` The average website scores ${averageScore}, which is ${averageScore - scanData.score} points higher.`
            )}
          </p>
          <p className="text-gecko-600 text-sm">
            {typeof scanData.trackerCount === 'number' && typeof averageTrackerCount === 'number' && (
              scanData.trackerCount <= averageTrackerCount
                ? `This site uses ${scanData.trackerCount} trackers, which is ${(averageTrackerCount - scanData.trackerCount).toFixed(1)} fewer than the average of ${averageTrackerCount.toFixed(1)} trackers per website.`
                : `This site uses ${scanData.trackerCount} trackers, compared to an average of ${averageTrackerCount.toFixed(1)} trackers across all analyzed websites.`
            )}
            {' '}Market comparison data helps you understand how a website&apos;s privacy practices compare to industry norms.
          </p>
        </section>
      )}

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

      {/* Remediation Recommendations Section - SEO enrichment (~100-200 words depending on issues) */}
      {topFixes && topFixes.length > 0 && (
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gecko-800 mb-2 flex items-center gap-2">
            <span className="text-amber-500">🛠️</span>
            How to improve {domain}&apos;s privacy
          </h3>
          <p className="text-gecko-700 mb-3">
            Based on Gecko Advisor&apos;s analysis, here are the top {topFixes.length} actionable{' '}
            {topFixes.length === 1 ? 'recommendation' : 'recommendations'} to improve {domain}&apos;s
            privacy score and protect user data:
          </p>
          <ol className="list-decimal list-inside space-y-4 text-gecko-700">
            {topFixes.map((fix, index) => (
              <li key={fix.id} className="leading-relaxed">
                <strong className="text-gecko-800">{fix.title}</strong>
                <span className="text-gecko-500 text-sm ml-2">
                  ({getPriorityText(fix.severity)} {getCategoryLabel(fix.category)})
                </span>
                {fix.whyItMatters && (
                  <p className="text-gecko-600 text-sm mt-1 ml-5">
                    <em>Why it matters:</em> {fix.whyItMatters}
                  </p>
                )}
                {fix.howToFix && (
                  <p className="text-gecko-700 text-sm mt-1 ml-5">
                    <em>Recommended action:</em> {fix.howToFix}
                  </p>
                )}
                {fix.references && fix.references.length > 0 && (
                  <p className="text-gecko-500 text-sm mt-1 ml-5">
                    Learn more:{' '}
                    {fix.references.map((ref, refIndex) => (
                      <span key={refIndex}>
                        {refIndex > 0 && ', '}
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-advisor-600 hover:text-advisor-700 underline"
                        >
                          {ref.label || 'Documentation'}
                        </a>
                      </span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <p className="text-gecko-600 text-sm mt-4">
            Implementing these {topFixes.length === 1 ? 'change' : 'changes'} can significantly
            improve {domain}&apos;s privacy posture and user trust. Prioritize based on the severity
            level indicated for each recommendation.
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
