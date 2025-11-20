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
      className="px-3 py-3 min-h-[44px] rounded border border-dark-border bg-dark-elevated hover:bg-dark-hover text-sm text-light-primary focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:ring-offset-2 focus:ring-offset-dark-bg transition-colors duration-150 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
    >
      {copied ? <span className="text-advisor-400">Copied!</span> : 'Copy link'}
    </button>
  );
}

