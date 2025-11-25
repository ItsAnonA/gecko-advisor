/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <>
      <main className="max-w-3xl mx-auto p-6 text-center space-y-4">
        <div className="text-6xl mb-4">404</div>
        <h1 className="text-2xl font-bold text-zinc-900 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">Page not found</h1>
        <p className="text-zinc-600">The page you're looking for doesn't exist.</p>
        <a href="/" className="inline-block px-6 py-3 mt-4 bg-advisor-500 text-dark-bg rounded-lg hover:bg-advisor-400 transition-colors font-semibold">Go home</a>
      </main>
      <Footer />
    </>
  );
}

