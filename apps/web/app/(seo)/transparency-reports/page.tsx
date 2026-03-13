import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getAllTransparencyReports,
  generateMonthList,
  formatSlugAsMonth,
  type TransparencyReportSummary,
} from '@/lib/transparency-reports';

export const metadata: Metadata = {
  title: 'Transparency Reports',
  description:
    'Monthly transparency reports showing Gecko Advisor prediction accuracy, retractions, and methodology changes. Every month accounted for — no gaps, no hidden failures.',
  openGraph: {
    title: 'Transparency Reports',
    description:
      'Monthly transparency reports showing prediction accuracy and retractions.',
    type: 'website',
  },
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PUBLISHED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
          Published
        </span>
      );
    case 'UPDATED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
          Updated
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600">
          Not published (draft)
        </span>
      );
    default:
      return null;
  }
}

function MissingRow({ slug }: { slug: string }) {
  return (
    <tr className="border-b border-red-100 bg-red-50/50">
      <td className="py-3 pr-4 font-medium text-zinc-900">
        {formatSlugAsMonth(slug)}
      </td>
      <td className="py-3 pr-4">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          Not published (error)
        </span>
      </td>
      <td className="py-3 pr-4 text-zinc-500">—</td>
      <td className="py-3 text-zinc-500">—</td>
    </tr>
  );
}

function ReportRow({ report }: { report: TransparencyReportSummary }) {
  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
      <td className="py-3 pr-4">
        <Link
          href={`/transparency-reports/${report.slug}`}
          className="font-medium text-emerald-700 hover:text-emerald-800 underline"
        >
          {formatSlugAsMonth(report.slug)}
        </Link>
      </td>
      <td className="py-3 pr-4">
        <StatusBadge status={report.status} />
        {report.autoPublished && (
          <span className="ml-1.5 text-xs text-zinc-500" title="Auto-published by scheduler">
            (auto)
          </span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm text-zinc-700">
        {report.keyFinding ?? '—'}
      </td>
      <td className="py-3 text-sm text-zinc-500">
        {report.publishedAt
          ? new Date(report.publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—'}
      </td>
    </tr>
  );
}

export default async function TransparencyReportsPage() {
  const reports = await getAllTransparencyReports();
  const allMonths = generateMonthList();

  // Index reports by slug for O(1) lookup
  const reportsBySlug = new Map<string, TransparencyReportSummary>();
  for (const r of reports) {
    reportsBySlug.set(r.slug, r);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-zinc prose-lg max-w-none">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            Transparency Reports
          </h1>
          <p className="text-lg text-zinc-600 leading-relaxed">
            Monthly accounting of Gecko Advisor&apos;s prediction accuracy,
            retractions, and methodology changes. Every month since launch is
            listed below. Missing months indicate a publication failure, not an
            omission.
          </p>
        </header>

        {/* Archive Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="text-left py-3 pr-4 font-semibold text-zinc-900">
                  Month
                </th>
                <th className="text-left py-3 pr-4 font-semibold text-zinc-900">
                  Status
                </th>
                <th className="text-left py-3 pr-4 font-semibold text-zinc-900">
                  Key Finding
                </th>
                <th className="text-left py-3 font-semibold text-zinc-900">
                  Published
                </th>
              </tr>
            </thead>
            <tbody>
              {allMonths.reverse().map((slug) => {
                const report = reportsBySlug.get(slug);
                return report ? (
                  <ReportRow key={slug} report={report} />
                ) : (
                  <MissingRow key={slug} slug={slug} />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer links */}
        <footer className="pt-8 mt-8 border-t border-zinc-200">
          <div className="flex flex-wrap gap-4 text-sm">
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
            <Link
              href="/"
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              Scan a website
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
