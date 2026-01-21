/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { notFound } from 'next/navigation';

/**
 * Catch-all route for unknown paths.
 * Returns 404 status via notFound() which triggers app/not-found.tsx
 */
export default function CatchAllNotFound() {
  notFound();
}
