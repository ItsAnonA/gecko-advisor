import React from 'react';
import { clsx } from 'clsx';

export default function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('bg-dark-elevated rounded-2xl shadow-xl border border-dark-border p-4', className)}>
      {children}
    </div>
  );
}

