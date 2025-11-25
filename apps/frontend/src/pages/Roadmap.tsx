/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Roadmap() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto p-6 pb-16 md:pb-24 space-y-12">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900">
            Roadmap
          </h1>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            Building the future of privacy transparency, one feature at a time
          </p>
        </div>

        {/* Current Features */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">
              Live Now
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              title="Privacy Scanning Engine"
              description="Analyzes cookies, trackers, security headers, and third-party resources in real-time"
              status="live"
            />
            <FeatureCard
              title="Evidence-Based Scoring"
              description="A-F letter grades (0-100 scale) with detailed evidence and explanations"
              status="live"
            />
            <FeatureCard
              title="Open Source Transparency"
              description="MIT licensed with full code transparency on GitHub"
              status="live"
            />
            <FeatureCard
              title="Tracker Database Integration"
              description="Powered by EasyPrivacy and WhoTracks.me databases"
              status="live"
            />
            <FeatureCard
              title="Recent Scans Feed"
              description="Public feed of latest privacy analyses across the web"
              status="live"
            />
            <FeatureCard
              title="Shareable Reports"
              description="Unique URLs for every scan report, no login required"
              status="live"
            />
          </div>
        </section>

        {/* Coming Soon */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">
              Coming Soon <span className="text-zinc-500 text-lg font-normal">(Q1-Q2 2025)</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              title="Browser Extension"
              description="One-click scanning for Chrome, Firefox, and Safari"
              status="planned"
            />
            <FeatureCard
              title="Mobile Apps"
              description="iOS and Android apps for privacy checks on the go"
              status="planned"
            />
            <FeatureCard
              title="Scheduled Scans"
              description="Automated rescans for continuous privacy monitoring"
              status="planned"
            />
            <FeatureCard
              title="Privacy Trends"
              description="Track privacy score changes over time with historical data"
              status="planned"
            />
            <FeatureCard
              title="Developer API"
              description="RESTful API with comprehensive documentation"
              status="planned"
            />
            <FeatureCard
              title="Site Comparison"
              description="Compare privacy practices across multiple websites"
              status="planned"
            />
            <FeatureCard
              title="GDPR Compliance Checker"
              description="Automated analysis of GDPR compliance requirements"
              status="planned"
            />
            <FeatureCard
              title="Cookie Consent Analyzer"
              description="Evaluate cookie consent banners for compliance and clarity"
              status="planned"
            />
          </div>
        </section>

        {/* Community Requested */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">
              Community Requested
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              title="PDF Export"
              description="Download scan reports as formatted PDF documents"
              status="community"
            />
            <FeatureCard
              title="Email Notifications"
              description="Get notified when scans complete or privacy scores change"
              status="community"
            />
            <FeatureCard
              title="Privacy Policy Generator"
              description="Custom privacy policy templates based on your practices"
              status="community"
            />
            <FeatureCard
              title="Tool Integrations"
              description="Connect with uBlock Origin, Privacy Badger, and other privacy tools"
              status="community"
            />
          </div>
        </section>

        {/* Long-term Vision */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-purple-400"></div>
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">
              Long-term Vision
            </h2>
          </div>
          <div className="space-y-4">
            <VisionCard
              title="Industry Standard for Privacy Transparency"
              description="Become the go-to tool for understanding website privacy practices"
            />
            <VisionCard
              title="Community-Driven Tracker Database"
              description="Enable users to contribute new trackers and improve detection accuracy"
            />
            <VisionCard
              title="Privacy Education Hub"
              description="Educational resources, guides, and interactive learning about digital privacy"
            />
            <VisionCard
              title="Website Privacy Certifications"
              description="Verifiable badges for websites that meet privacy standards"
            />
          </div>
        </section>

        {/* Call to Action */}
        <section className="mt-12 p-8 rounded-xl bg-emerald-50 border border-emerald-200">
          <h3 className="text-2xl font-bold text-zinc-900 mb-4">
            Shape the Future
          </h3>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            Gecko Advisor is open source and community-driven. Your feedback shapes our roadmap.
            Request features, vote on priorities, or contribute code on GitHub.
          </p>
          <a
            href="https://github.com/privacygecko/gecko-advisor/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg hover:scale-105 transition-transform"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            View Feature Requests
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  status: 'live' | 'planned' | 'community';
}

function FeatureCard({ title, description, status }: FeatureCardProps) {
  const statusConfig = {
    live: { color: 'bg-emerald-500', label: 'Live' },
    planned: { color: 'bg-amber-400', label: 'Planned' },
    community: { color: 'bg-blue-400', label: 'Requested' },
  };

  const config = statusConfig[status];

  return (
    <div className="p-6 rounded-xl bg-white border border-gray-200 hover:border-emerald-200 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
        <span className={`px-2 py-1 text-xs font-semibold rounded ${config.color} text-white whitespace-nowrap`}>
          {config.label}
        </span>
      </div>
      <p className="text-sm text-zinc-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

interface VisionCardProps {
  title: string;
  description: string;
}

function VisionCard({ title, description }: VisionCardProps) {
  return (
    <div className="p-6 rounded-xl bg-white border border-gray-200">
      <h3 className="text-lg font-bold text-zinc-900 mb-2">{title}</h3>
      <p className="text-sm text-zinc-600 leading-relaxed">{description}</p>
    </div>
  );
}
