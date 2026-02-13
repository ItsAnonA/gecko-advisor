import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getTransparencyReport,
  formatSlugAsMonth,
  type MetricsSnapshotV1,
} from '@/lib/transparency-reports';
import { formatAccuracy, formatSubtypeAccuracy } from '@/lib/editorial-language';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const report = await getTransparencyReport(slug);
  if (!report) {
    return { title: 'Report Not Found | Gecko Advisor' };
  }
  const monthName = formatSlugAsMonth(slug);
  return {
    title: `${monthName} Transparency Report | Gecko Advisor`,
    description: report.keyFinding ?? `Gecko Advisor transparency report for ${monthName}.`,
    openGraph: {
      title: `${monthName} Transparency Report | Gecko Advisor`,
      description: report.keyFinding ?? `Monthly transparency report for ${monthName}.`,
      type: 'article',
    },
  };
}

function MetricsTable({ metrics }: { metrics: MetricsSnapshotV1 }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-zinc-900">{metrics.predictions}</div>
          <div className="text-xs text-zinc-500 mt-1">Predictions Issued</div>
        </div>
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-zinc-900">{metrics.validated}</div>
          <div className="text-xs text-zinc-500 mt-1">Validated</div>
        </div>
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-zinc-900">{metrics.invalidated}</div>
          <div className="text-xs text-zinc-500 mt-1">Invalidated</div>
        </div>
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-zinc-900">{metrics.retractions}</div>
          <div className="text-xs text-zinc-500 mt-1">Retractions</div>
        </div>
      </div>

      {/* Overall accuracy */}
      <div className="bg-zinc-50 rounded-lg p-4">
        <div className="text-sm font-medium text-zinc-700 mb-1">Overall Accuracy</div>
        <div className="text-base text-zinc-900">
          {formatAccuracy(metrics.accuracy, metrics.validated)}
        </div>
      </div>

      {/* Per-type breakdown */}
      {Object.keys(metrics.byType).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-3">By Prediction Type</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 pr-4 font-semibold text-zinc-700">Type</th>
                  <th className="text-right py-2 pr-4 font-semibold text-zinc-700">Issued</th>
                  <th className="text-right py-2 pr-4 font-semibold text-zinc-700">Validated</th>
                  <th className="text-right py-2 pr-4 font-semibold text-zinc-700">Invalidated</th>
                  <th className="text-right py-2 font-semibold text-zinc-700">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(metrics.byType).map(([type, data]) => (
                  <tr key={type} className="border-b border-zinc-100">
                    <td className="py-2 pr-4 font-mono text-xs text-zinc-700">{type}</td>
                    <td className="py-2 pr-4 text-right text-zinc-900">{data.predictions}</td>
                    <td className="py-2 pr-4 text-right text-zinc-900">{data.validated}</td>
                    <td className="py-2 pr-4 text-right text-zinc-900">{data.invalidated}</td>
                    <td className="py-2 text-right text-zinc-700">
                      {formatSubtypeAccuracy(data.accuracy, data.validated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Freeze status */}
      <div className="bg-zinc-50 rounded-lg p-4">
        <div className="text-sm font-medium text-zinc-700 mb-1">Freeze Status</div>
        <div className="text-base text-zinc-900">
          {metrics.freeze.overallFrozen
            ? 'Overall predictions FROZEN due to accuracy failure.'
            : 'No freeze in effect.'}
        </div>
        {metrics.freeze.frozenTypes.length > 0 && (
          <div className="text-sm text-zinc-600 mt-1">
            Frozen subtypes: {metrics.freeze.frozenTypes.join(', ')}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-zinc-400 space-y-0.5">
        <div>Data vintage: {metrics.dataVintage}</div>
        <div>Scoring version: {metrics.scoringVersion}</div>
        <div>Calibration version: {metrics.calibrationVersion}</div>
      </div>
    </div>
  );
}

export default async function TransparencyReportDetailPage({ params }: Props) {
  const { slug } = await params;
  const report = await getTransparencyReport(slug);

  if (!report) {
    notFound();
  }

  const monthName = formatSlugAsMonth(slug);
  const metrics = report.metricsSnapshot as MetricsSnapshotV1;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-zinc prose-lg max-w-none">
        {/* Breadcrumb */}
        <nav className="text-sm text-zinc-500 mb-6">
          <Link
            href="/transparency-reports"
            className="text-emerald-600 hover:text-emerald-700 underline no-underline"
          >
            Transparency Reports
          </Link>
          <span className="mx-2">/</span>
          <span>{monthName}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-3">
            {report.title}
          </h1>

          {/* Scars: autoPublished, UPDATED status */}
          <div className="flex flex-wrap gap-2 mb-4">
            {report.status === 'UPDATED' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                Updated — {report.revisionNote ?? 'Correction applied'}
              </span>
            )}
            {report.status === 'DRAFT' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-200 text-zinc-600">
                Draft — Not yet published
              </span>
            )}
            {report.autoPublished && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Auto-published by scheduler
              </span>
            )}
          </div>

          {report.publishedAt && (
            <p className="text-sm text-zinc-500">
              Published{' '}
              {new Date(report.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </p>
          )}
        </header>

        {/* Key Finding */}
        {report.keyFinding && (
          <blockquote className="border-l-4 border-emerald-500 bg-emerald-50/50 pl-4 py-3 my-6 not-prose">
            <p className="text-base font-medium text-zinc-800">
              {report.keyFinding}
            </p>
          </blockquote>
        )}

        {/* Metrics Snapshot */}
        <section className="my-8 not-prose">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">
            Metrics Snapshot
          </h2>
          <MetricsTable metrics={metrics} />
        </section>

        {/* Content */}
        <section className="my-8">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Report</h2>
          <div className="whitespace-pre-wrap text-zinc-700">{report.content}</div>
        </section>

        {/* Quotables */}
        {report.quotables.length > 0 && (
          <section className="my-8 not-prose">
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">
              Key Statements
            </h2>
            <div className="space-y-3">
              {report.quotables.map((q, i) => (
                <blockquote
                  key={i}
                  className="border-l-4 border-zinc-300 pl-4 py-2 text-zinc-700 italic"
                >
                  &ldquo;{q}&rdquo;
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="pt-8 mt-8 border-t border-zinc-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link
              href="/transparency-reports"
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              All Reports
            </Link>
            <Link
              href="/transparency/accuracy"
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              Prediction Accuracy
            </Link>
            <Link
              href="/methodology"
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              Methodology
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
