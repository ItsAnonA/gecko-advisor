import clsx from 'clsx';
import type { TopFixView } from '../lib/adapters/scan';

const SEVERITY_COLORS: Record<TopFixView['severity'], string> = {
  critical: 'bg-score-danger/20 text-score-danger',
  high: 'bg-[#ff6b35]/20 text-[#ff6b35]',
  medium: 'bg-score-caution/20 text-score-caution',
  low: 'bg-trust-600/20 text-trust-400',
  info: 'bg-dark-elevated text-light-secondary',
};

export interface FixCardProps {
  fix: TopFixView;
}

export function FixCard({ fix }: FixCardProps) {
  return (
    <article className="h-full rounded-2xl border border-dark-border bg-dark-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{fix.title}</h3>
        <span className={clsx('whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold uppercase', SEVERITY_COLORS[fix.severity])}>
          {fix.severity}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-light-tertiary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{fix.category}</p>
      {fix.whyItMatters && <p className="mt-3 text-sm text-light-secondary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{fix.whyItMatters}</p>}
      {fix.howToFix && <p className="mt-2 text-sm font-medium text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{fix.howToFix}</p>}
      {fix.references.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-advisor-400">
          {fix.references.map((ref, index) => (
            <li key={ref.url ?? index}>
              <a className="underline hover:text-advisor-300 transition-colors drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" href={ref.url} target="_blank" rel="noreferrer">
                {ref.label ?? ref.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
