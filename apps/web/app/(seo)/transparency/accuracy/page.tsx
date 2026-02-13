import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Prediction Accuracy | Gecko Advisor',
  description:
    'Rolling 90-day prediction accuracy for Gecko Advisor privacy insights. Updated monthly with full methodology transparency.',
  openGraph: {
    title: 'Prediction Accuracy | Gecko Advisor',
    description: 'Rolling 90-day accuracy metrics for privacy predictions.',
    type: 'website',
  },
};

export default function AccuracyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-zinc prose-lg max-w-none">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            Prediction Accuracy
          </h1>
          <p className="text-lg text-zinc-600 leading-relaxed">
            Rolling 90-day accuracy for Gecko Advisor privacy predictions.
            This page will display statistical accuracy once sufficient
            predictions have been validated.
          </p>
        </header>

        {/* Current state */}
        <section className="my-8 not-prose">
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 space-y-4">
            <div>
              <div className="text-sm font-medium text-zinc-500 mb-1">
                Rolling 90-day accuracy
              </div>
              <div className="text-xl font-semibold text-zinc-900">
                Insufficient validated predictions.
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-zinc-500 mb-1">
                Validated predictions
              </div>
              <div className="text-xl font-semibold text-zinc-900">0</div>
            </div>

            <div>
              <div className="text-sm font-medium text-zinc-500 mb-1">
                Minimum for statistical reporting
              </div>
              <div className="text-base text-zinc-700">
                50 validated predictions required. No Wilson confidence intervals
                until that threshold is reached.
              </div>
            </div>
          </div>
        </section>

        {/* Why it's empty */}
        <section className="my-8">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">
            Why This Page Is Empty
          </h2>
          <p className="text-zinc-700 mb-4">
            Predictions require a minimum observation period before validation.
            The first validations will occur no earlier than 30 days after
            issuance. Until then, subtype accuracy is not measurable.
          </p>
          <p className="text-zinc-700">
            We will not count unvalidated claims as wins. Rolling accuracy
            excludes pending predictions.
          </p>
        </section>

        {/* What will appear */}
        <section className="my-8">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">
            What Will Appear Here
          </h2>
          <ul className="space-y-2 text-zinc-700">
            <li>Overall prediction accuracy (90-day rolling window)</li>
            <li>Per-subtype accuracy breakdown</li>
            <li>Freeze status for underperforming prediction types</li>
            <li>Retraction count and latency metrics</li>
          </ul>
          <p className="text-zinc-600 text-sm mt-4">
            Statistical confidence intervals (Wilson CI) will be introduced
            once validated predictions exceed 50.
          </p>
        </section>

        {/* Footer */}
        <footer className="pt-8 mt-8 border-t border-zinc-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link
              href="/transparency-reports"
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              Transparency Reports
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
