/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * FingerprintingExplainer - Conditional SEO block
 *
 * Displayed when fingerprinting is detected on a site.
 * Provides unique, educational content that differentiates this report.
 */

import React from 'react';

interface Props {
  domain: string;
  fingerprintingTypes?: string[];
}

export function FingerprintingExplainer({ domain, fingerprintingTypes = [] }: Props) {
  const hasCanvas = fingerprintingTypes.includes('canvas');
  const hasWebGL = fingerprintingTypes.includes('webgl');
  const hasAudio = fingerprintingTypes.includes('audio');

  return (
    <section
      className="bg-amber-50 border border-amber-200 rounded-lg p-5 my-6"
      aria-labelledby="fingerprinting-explainer-heading"
    >
      <h3
        id="fingerprinting-explainer-heading"
        className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
          />
        </svg>
        Browser Fingerprinting Detected on {domain}
      </h3>

      <div className="space-y-4 text-amber-800">
        <p>
          This website uses <strong>browser fingerprinting</strong> to identify visitors. Unlike
          cookies, fingerprinting works even in private browsing mode and cannot be easily blocked
          or deleted.
        </p>

        <div className="bg-amber-100 rounded p-4">
          <h4 className="font-medium text-amber-900 mb-2">What is Browser Fingerprinting?</h4>
          <p className="text-sm">
            Fingerprinting collects technical details about your browser and device (screen size,
            installed fonts, graphics card, etc.) to create a unique identifier. This &quot;fingerprint&quot;
            can track you across websites without storing anything on your device.
          </p>
        </div>

        {(hasCanvas || hasWebGL || hasAudio) && (
          <div>
            <h4 className="font-medium text-amber-900 mb-2">
              Fingerprinting techniques detected:
            </h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {hasCanvas && (
                <li>
                  <strong>Canvas fingerprinting</strong> - Draws hidden graphics to identify your
                  graphics hardware
                </li>
              )}
              {hasWebGL && (
                <li>
                  <strong>WebGL fingerprinting</strong> - Uses 3D rendering capabilities to
                  identify your GPU
                </li>
              )}
              {hasAudio && (
                <li>
                  <strong>Audio fingerprinting</strong> - Analyzes how your device processes sound
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="bg-white/50 rounded p-4 mt-4">
          <h4 className="font-medium text-amber-900 mb-2">How to protect yourself:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Use a privacy-focused browser like Firefox with Enhanced Tracking Protection</li>
            <li>Install anti-fingerprinting extensions like CanvasBlocker</li>
            <li>Consider using Tor Browser for maximum fingerprinting resistance</li>
            <li>
              Use browser settings to block or randomize fingerprinting data where available
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
