/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
export interface ReportStorageKeyOptions {
  prefix?: string;
  extension?: string;
}

export function buildReportStorageKey(scanId: string, options: ReportStorageKeyOptions = {}): string {
  const prefix = (options.prefix ?? 'reports/').replace(/\/?$/, '/');
  const extension = options.extension ?? '.json';
  return `${prefix}${scanId}${extension}`;
}
