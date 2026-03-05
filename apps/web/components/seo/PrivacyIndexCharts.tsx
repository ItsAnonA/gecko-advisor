'use client';

/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Privacy Index Charts (Phase B2 SEO)
 *
 * Client component for Recharts visualizations on /privacy-index.
 * These charts are what journalists screenshot and link to.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CategoryData {
  name: string;
  slug: string;
  avgScore: number;
  avgTrackers: number;
  domainCount: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
}

function getScoreBarColor(score: number): string {
  if (score >= 90) return '#059669'; // emerald-600
  if (score >= 80) return '#10b981'; // emerald-500
  if (score >= 70) return '#f59e0b'; // amber-500
  if (score >= 60) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

function getDistColor(range: string): string {
  if (range.startsWith('90')) return '#059669';
  if (range.startsWith('80')) return '#10b981';
  if (range.startsWith('70')) return '#f59e0b';
  if (range.startsWith('60')) return '#f97316';
  return '#ef4444';
}

export function CategoryScoreChart({ data }: { data: CategoryData[] }) {
  const sorted = [...data].sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ left: 100, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            width={95}
          />
          <Tooltip
            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}`, 'Avg Score']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7' }}
          />
          <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, index) => (
              <Cell key={index} fill={getScoreBarColor(entry.avgScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreDistributionChart({ data }: { data: ScoreDistribution[] }) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="range" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), 'Domains']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getDistColor(entry.range)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrackerPrevalenceChart({ data }: { data: Array<{ name: string; count: number }> }) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ left: 120, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            width={115}
          />
          <Tooltip
            formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), 'Domains']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7' }}
          />
          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
