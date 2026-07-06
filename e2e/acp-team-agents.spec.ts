/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { test, expect } from '@playwright/test'
import { collectPageErrors, loginViaOidc, revokeTeamAgents, seedTeamAgents, type SeedAgentCard } from './helpers'

/**
 * Stage 7 T6 — member happy path + governing invariants for company (team)
 * agents, end-to-end.
 *
 * Company agents reach the client only through org discovery, which has no live
 * member client in v1, so the device-local `team_agents_cache` is seeded via the
 * DEV-only window seam (`src/devtools/test-seed.ts`). Everything asserted here is
 * deterministic and needs no real upstream ACP agent or model provider.
 *
 * Invariant coverage demonstrated in THIS spec:
 *   - I1 (nothing is configurable): the company agent detail exposes no edit
 *     surface — only Start a chat + read-only capability rows.
 *   - I4 (revocation is total, removal half): clearing the cache removes the
 *     agent from the selector AND the Agents page AND collapses its detail to the
 *     read-only "access removed" state.
 * (I2 is a contract test — shared/agent-cards.test.ts + admin-service
 *  discovery/build-card.test.ts; I3 is the compile-level seal test —
 *  src/acp/session-contributors.test.ts; I5 is admin-service grant-math tests.
 *  The revoked-composer "thread read-only banner" half of I4 is unit-covered by
 *  src/components/chat/composer-block.test.tsx. See the T6 coverage map.)
 */

const sealedCard: SeedAgentCard = {
  id: 'e2e-finance-kb',
  name: 'Finance KB',
  icon: '🏦',
  description: 'Answers finance policy questions',
  category: 'sealed',
  capabilities: [{ label: 'Search the finance wiki' }],
  advertisedModels: ['gpt-5'],
  managedBy: 'Finance Platform',
  grantedVia: 'Everyone',
}

const extensibleCard: SeedAgentCard = {
  id: 'e2e-sales-copilot',
  name: 'Sales Copilot',
  icon: '📈',
  description: 'Drafts outreach with your skills',
  category: 'extensible',
  capabilities: [{ label: 'Draft an email', credentialMode: 'as_you' }],
  advertisedModels: ['claude-opus-4'],
  managedBy: 'RevOps',
  grantedVia: 'Sales (group)',
}

test.describe('Company agents — member happy path + invariants', () => {
  test('granted company agents appear (with grant highlight), are read-only (I1), and are selectable', async ({
    page,
  }) => {
    const errors = collectPageErrors(page)
    await loginViaOidc(page)
    await seedTeamAgents(page, [sealedCard, extensibleCard])

    // --- Agents page: org section lists both cards with the one-time grant highlight (T2) ---
    await page.goto('/settings/agents')
    await expect(page.getByTestId('agent-section-org')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId(`agent-row-${sealedCard.id}`)).toBeVisible()
    await expect(page.getByTestId(`agent-row-${extensibleCard.id}`)).toBeVisible()
    // Grant-received highlight: both newly-granted cards carry a "New" badge.
    await expect(page.getByTestId('new-grant-badge')).toHaveCount(2)

    // --- I1: the company agent detail has NO edit affordance ---
    await page.getByTestId(`agent-row-${sealedCard.id}`).click()
    await expect(page.getByTestId('agent-start-chat')).toBeVisible()
    // Read-only: no text inputs, no Save/Edit/Delete controls anywhere on the detail.
    await expect(page.locator('textarea')).toHaveCount(0)
    await expect(page.locator('input[type="text"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /save|edit|delete|remove/i })).toHaveCount(0)

    // --- Selector: both company agents are pickable under "From your organization" ---
    await page.goto('/')
    const trigger = page.getByTestId('chat-agent-selector-trigger')
    await expect(trigger).toBeVisible({ timeout: 10_000 })
    await trigger.click()
    await expect(page.getByText('From your organization')).toBeVisible()
    await page.getByText(sealedCard.name).click()
    // Picking the company agent binds it — the trigger now shows its name.
    await expect(trigger).toContainText(sealedCard.name)

    expect(errors).toEqual([])
  })

  test('revoking the grant removes the agent from every surface (I4, removal)', async ({ page }) => {
    const errors = collectPageErrors(page)
    await loginViaOidc(page)
    await seedTeamAgents(page, [sealedCard])

    await page.goto('/settings/agents')
    await expect(page.getByTestId(`agent-row-${sealedCard.id}`)).toBeVisible({ timeout: 10_000 })

    // Total revocation: drop the grant-filtered cache.
    await revokeTeamAgents(page)

    // The org section (and the row) disappear from the Agents page.
    await expect(page.getByTestId(`agent-row-${sealedCard.id}`)).toHaveCount(0, { timeout: 10_000 })
    await expect(page.getByTestId('agent-section-org')).toHaveCount(0)

    // Its detail route collapses to the read-only "access removed" state.
    await page.goto(`/settings/agents/${sealedCard.id}`)
    await expect(page.getByTestId('agent-revoked-banner')).toBeVisible({ timeout: 10_000 })

    // And it is gone from the composer selector.
    await page.goto('/')
    const trigger = page.getByTestId('chat-agent-selector-trigger')
    await expect(trigger).toBeVisible({ timeout: 10_000 })
    await trigger.click()
    await expect(page.getByText(sealedCard.name)).toHaveCount(0)

    expect(errors).toEqual([])
  })

  // NOTE — "sidebar filter narrows + clears" is intentionally NOT e2e here: the
  // filter bar only renders once the chat list is non-empty (`showHeaderRow` in
  // src/layout/sidebar/chat-list.tsx), and creating a persisted thread requires a
  // real model round-trip the OIDC harness has no provider for. The filter UI
  // (narrow + one-tap clear) is covered by src/layout/sidebar/chat-filter-bar.test.tsx
  // and its matching logic by src/layout/sidebar/chat-filters.test.ts.
})
