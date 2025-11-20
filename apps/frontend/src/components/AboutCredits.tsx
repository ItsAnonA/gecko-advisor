/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export default function AboutCredits() {
  return (
    <div className="prose prose-invert max-w-none p-6">
      <h1 className="text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">About & Credits</h1>

      <section className="mb-8 p-6 bg-advisor-600/20 border-l-4 border-advisor-500 rounded-r-lg">
        <h2 className="text-2xl font-bold text-advisor-300 mt-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">About Gecko Advisor</h2>
        <p className="text-lg text-light-secondary leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          Gecko Advisor helps everyone understand how websites track and collect data. Our open-source privacy scanner reveals hidden trackers, cookies, and data collection practices—making privacy transparency accessible to all.
        </p>
        <p className="text-lg text-light-secondary leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          Our open-source methodology ensures transparency and reproducibility. All scanning logic is public, deterministic, and auditable. We analyze privacy practices without collecting user data—our commitment to privacy extends to our own operations.
        </p>
        <p className="text-lg text-light-secondary leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          Founded on the principle that privacy transparency benefits everyone, Gecko Advisor is open source and accessible to anyone who wants to understand how websites handle their data.
        </p>

        <h3 className="text-xl font-bold text-advisor-400 mt-6 mb-3 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Our Approach</h3>
        <ul className="text-base text-light-secondary space-y-2 my-4">
          <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><strong className="text-light-primary">Open-source methodology</strong> for full auditability</li>
          <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><strong className="text-light-primary">Deterministic scoring</strong> for reproducible results</li>
          <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><strong className="text-light-primary">Evidence-based analysis</strong> backed by recognized privacy databases</li>
          <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><strong className="text-light-primary">Open source and accessible</strong> for everyone who cares about privacy</li>
        </ul>

        <h3 className="text-xl font-bold text-advisor-400 mt-6 mb-3 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Our Values</h3>
        <ul className="text-base text-light-secondary space-y-2 my-4">
          <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><strong className="text-light-primary">Transparency:</strong> Our code, data sources, and methodology are public</li>
          <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><strong className="text-light-primary">Accuracy:</strong> We cite sources and provide evidence for every finding</li>
          <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><strong className="text-light-primary">Privacy:</strong> We don't track users while analyzing tracking</li>
          <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><strong className="text-light-primary">Accessibility:</strong> Open and accessible for everyone to use</li>
        </ul>
      </section>

      <h2 className="text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">What We Do</h2>
      <p className="text-light-secondary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        Gecko Advisor provides explainable privacy checks for user-submitted URLs.
        It uses bundled, offline lists for deterministic scans in tests and production.
      </p>

      <h2 className="text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Data Sources & Attribution</h2>
      <p className="text-base text-light-secondary mb-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        Gecko Advisor's privacy analysis is powered by industry-recognized privacy databases and our own proprietary scanning engine. We transparently disclose all data sources:
      </p>
      <ul className="text-light-secondary">
        <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          <strong className="text-light-primary">EasyPrivacy</strong> — Dual licensed (GPL v3 + Creative Commons BY-SA 3.0). Used server-side for tracker detection.
          <br />
          <a href="https://easylist.to/" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">Official Site</a> ·
          <a href="https://easylist.to/easylist/easyprivacy.txt" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">License Info</a> ·
          <a href="https://github.com/easylist/easylist" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">GitHub</a>
          <br />
          <em className="text-light-tertiary">Attribution: EasyPrivacy filter list by EasyList contributors (easylist.to)</em>
        </li>
        <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          <strong className="text-light-primary">WhoTracks.me</strong> — Tracker database under Creative Commons Attribution 4.0 International License.
          <br />
          <a href="https://whotracks.me/" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">Official Site</a> ·
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">CC BY 4.0 License</a> ·
          <a href="https://github.com/ghostery/whotracks.me" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">GitHub</a>
          <br />
          <em className="text-light-tertiary">Attribution: WhoTracks.me data by Ghostery GmbH, used under CC BY 4.0</em>
        </li>
        <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          <strong className="text-light-primary">Public Suffix List</strong> — Maintained by Mozilla contributors under Mozilla Public License.
          <br />
          <a href="https://publicsuffix.org/" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">Official Site</a> ·
          <a href="https://github.com/publicsuffix/list" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">GitHub</a>
        </li>
      </ul>

      <h2 className="text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Fonts</h2>
      <ul className="text-light-secondary">
        <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          <strong className="text-light-primary">Inter Font</strong> — Created by Rasmus Andersson, licensed under SIL Open Font License 1.1.
          <br />
          <a href="https://github.com/rsms/inter" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">GitHub</a> ·
          <a href="https://rsms.me/inter/" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">Official Site</a> ·
          <a href="/fonts/OFL.txt" target="_blank" rel="noreferrer" className="text-advisor-400 hover:text-advisor-300">OFL License</a>
          <br />
          <em className="text-light-tertiary">Copyright © 2020 The Inter Project Authors</em>
        </li>
      </ul>

      <h2 className="text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Legal</h2>
      <ul className="text-light-secondary">
        <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><a href="/terms.html" className="text-advisor-400 hover:text-advisor-300">Terms of Use</a></li>
        <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><a href="/privacy.html" className="text-advisor-400 hover:text-advisor-300">Privacy Policy</a></li>
        <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><a href="/NOTICE.md" className="text-advisor-400 hover:text-advisor-300">NOTICE</a></li>
        <li className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"><a href="/LICENSE-THIRD-PARTY.md" className="text-advisor-400 hover:text-advisor-300">Third-Party Licenses</a></li>
      </ul>

      <h2 className="text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Scanning Policy</h2>
      <p className="text-light-secondary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        We only scan URLs explicitly submitted by users. Crawls are shallow (≤10 pages or ≤10s) and rate-limited.
        For concerns, contact us via the link in the footer.
      </p>
    </div>
  );
}
