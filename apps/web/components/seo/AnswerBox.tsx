/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Answer Box Component (Phase C1)
 *
 * Featured snippet card for answer pages. Targets Google's
 * featured snippet format with clear headline + data points.
 */

interface DataPoint {
  label: string;
  value: string;
}

interface AnswerBoxProps {
  headline: string;
  dataPoints: DataPoint[];
}

export function AnswerBox({ headline, dataPoints }: AnswerBoxProps) {
  return (
    <div className="p-6 bg-advisor-50 border-2 border-advisor-200 rounded-xl mb-8">
      <p className="text-lg font-semibold text-zinc-900 mb-4">{headline}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {dataPoints.map((dp) => (
          <div key={dp.label}>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{dp.label}</p>
            <p className="text-xl font-bold text-zinc-900 tabular-nums">{dp.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
