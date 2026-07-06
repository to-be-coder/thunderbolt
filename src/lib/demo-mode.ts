/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Prototype demo mode (`VITE_DEMO_MODE=true`). A click-around mode for showing
 * the agent-access design without real auth or a populated org:
 *
 *  - the anonymous session is presented as a signed-in admin ("Demo Admin"),
 *    which unhides the Agents page and the /admin console gate;
 *  - the device-local team-agents / org-policy caches are seeded so the member
 *    surfaces show company agents;
 *  - the admin console's data layer is served from an in-memory store, so every
 *    screen is explorable with live (session-scoped) mutations.
 *
 * Every demo hook is gated behind this flag, so with it off (the default) the
 * app behaves exactly as in production. Nothing here ships enabled.
 */
export const isDemoMode = (): boolean => import.meta.env.VITE_DEMO_MODE === 'true'

/** The fabricated admin identity presented throughout demo mode. */
export const demoUser = {
  name: 'Demo Admin',
  email: 'admin@demo.thunderbolt',
} as const
