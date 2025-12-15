/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import Card from '../components/Card';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSearchParams } from 'react-router-dom';

export default function Compare() {
  const [sp, setSp] = useSearchParams();
  const left = sp.get('left') || '';
  const right = sp.get('right') || '';
  const [input, setInput] = React.useState(right);

  function addRight() {
    const s = new URLSearchParams(sp);
    if (input) s.set('right', input);
    setSp(s, { replace: true });
  }

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold text-zinc-900 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">Compare Reports (beta)</h1>
      <div className="flex gap-4">
        <Card>
          <div className="font-semibold mb-2 text-zinc-900">Left</div>
          {left ? (
            <a className="text-advisor-400 hover:text-advisor-300 underline" href={`/r/${left}`}>{left}</a>
          ) : (
            <div className="text-zinc-500">Add left via the Compare button on a report.</div>
          )}
        </Card>
        <Card>
          <div className="font-semibold mb-2 text-zinc-900">Right</div>
          {right ? (
            <a className="text-advisor-400 hover:text-advisor-300 underline" href={`/r/${right}`}>{right}</a>
          ) : (
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} className="border border-gray-200 bg-white rounded px-2 py-1 text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-advisor-500" placeholder="enter report slug" />
              <button className="px-3 py-1 rounded bg-advisor-600 text-white hover:bg-advisor-500 transition-colors" onClick={addRight}>Add</button>
            </div>
          )}
        </Card>
      </div>
      {(left && right) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <iframe title="left" src={`/r/${left}`} className="w-full h-[70vh] border border-gray-200 rounded bg-stone-50" />
          <iframe title="right" src={`/r/${right}`} className="w-full h-[70vh] border border-gray-200 rounded bg-stone-50" />
        </div>
      )}
      </div>
      <Footer />
    </>
  );
}
