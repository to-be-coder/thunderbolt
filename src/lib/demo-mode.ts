/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createClient, type HttpClient } from '@/lib/http'

/**
 * Prototype demo mode (`VITE_DEMO_MODE=true`). A self-contained click-around
 * mode for showing the agent-access design without a backend or populated org:
 *
 *  - the app boots against its local standalone database;
 *  - a local signed-in admin identity unhides the Agents page and `/admin`;
 *  - device-local team-agent and org-policy caches seed member surfaces;
 *  - the admin console uses an in-memory store, so every screen is explorable
 *    with live, session-scoped mutations.
 *
 * Every demo hook is gated behind this flag, so with it off (the default) the
 * app behaves exactly as in production. Nothing here ships enabled.
 */
export const isDemoMode = (): boolean => import.meta.env.VITE_DEMO_MODE === 'true'

/** Reserved URL used only to satisfy context consumers that require an HTTP client. */
export const demoCloudUrl = 'https://demo.invalid/v1'

/** Create an HTTP client that fails locally instead of issuing network requests in demo mode. */
export const createDemoHttpClient = (): HttpClient =>
  createClient({
    prefixUrl: demoCloudUrl,
    fetch: async () =>
      new Response(JSON.stringify({ error: 'Network features are unavailable in demo mode' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
  })

/** The fabricated admin identity presented throughout demo mode. */
export const demoUser = {
  name: 'Demo Admin',
  email: 'admin@demo.thunderbolt',
} as const
