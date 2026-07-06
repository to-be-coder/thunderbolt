/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { test, expect } from '@playwright/test'
import { collectPageErrors, loginViaOidc } from './helpers'

/**
 * E2E for the backend-driven system-agent discovery bootstrap.
 *
 * On bootstrap (`useBootstrapSystemAgents` in `src/app.tsx`) the app still calls
 * `GET {cloudUrl}/agents` once the user has a non-anonymous session and
 * reconciles the response into the device-local `agents_system` table
 * (`refreshSystemAgents`). We intercept that call with a synthetic Haystack
 * entry and verify the bootstrap path is exercised.
 *
 * NOTE — the Stage 5 read-only rewrite of the Agents page (agents-page-spec §1)
 * intentionally removed the user-visible system-agent row, its "System" badge,
 * and the per-row delete affordance. In v1 agent-access a managed/company agent
 * reaches a member ONLY through org discovery as a read-only team card
 * (`team_agents_cache`); the member-facing "appears / read-only / revocable"
 * behaviour is covered end-to-end by `e2e/acp-team-agents.spec.ts`. The
 * `agents_system` bootstrap path below is still live, so this spec guards that
 * it (1) fires and reconciles without surfacing page errors and (2) leaves the
 * rewritten Agents page fully read-only — no delete/remove affordance anywhere.
 * That read-only assertion is the faithful v1 replacement for the old
 * per-system-agent "not removable" check.
 *
 * Route registration happens before `page.goto` so the very first bootstrap
 * fetch is intercepted; otherwise the real backend's (empty) response would
 * race with the mock.
 */
test.describe('ACP system agent discovery bootstrap', () => {
  test('bootstrap discovery fires and the read-only Agents page exposes no delete affordance', async ({ page }) => {
    const errors = collectPageErrors(page)

    let discoveryHits = 0
    await page.route('**/v1/agents', async (route) => {
      discoveryHits += 1
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '1',
          agents: [
            {
              id: 'haystack-rag',
              name: 'RAG Chat',
              type: 'managed-acp',
              transport: 'websocket',
              url: 'wss://test.example/ws',
              description: 'Retrieval-augmented chat',
              icon: null,
              isSystem: 1,
            },
          ],
          allowCustomAgents: true,
        }),
      })
    })

    await loginViaOidc(page)

    await page.goto('/settings/agents')
    await expect(page.getByTestId('agent-list')).toBeVisible({ timeout: 10_000 })

    // The discovery endpoint should have been called at least once during
    // bootstrap — the `useBootstrapSystemAgents` → `refreshSystemAgents` path.
    await expect.poll(() => discoveryHits, { timeout: 10_000 }).toBeGreaterThan(0)

    // The read-only rewrite exposes NO delete/remove control anywhere on the
    // page: every row opens a read-only detail view, nothing is user-managed.
    await expect(page.getByRole('button', { name: /delete|remove/i })).toHaveCount(0)

    expect(errors).toHaveLength(0)
  })
})
