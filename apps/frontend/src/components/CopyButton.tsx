/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import toast from 'react-hot-toast';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy link');
    }
  }
  return (
    <button
      onClick={copy}
      className="px-3 py-3 min-h-[44px] rounded border border-gray-200 bg-white hover:bg-gray-100 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:ring-offset-2 focus:ring-offset-dark-bg transition-colors duration-150 "
    >
      {copied ? <span className="text-advisor-400">Copied!</span> : 'Copy link'}
    </button>
  );
}

