/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { expect, type Page } from '@playwright/test'

declare global {
  interface Window {
    __thunderboltTestSeed?: {
      seedTeamAgents: (cards: unknown[]) => Promise<void>
      seedOrgPolicy: (policy: unknown) => Promise<void>
      clearTeamAgents: () => Promise<void>
    }
  }
}

/**
 * Navigate to the app root, let the SSO flow complete naturally through
 * the mock identity provider, and wait for the authenticated chat UI to render.
 *
 * Onboarding is disabled via VITE_SKIP_ONBOARDING env var in playwright.config.ts.
 */

/**
 * OIDC flow: / -> AuthGate -> /sso-redirect -> POST sign-in/sso -> mock IdP /authorize
 * (auto-approves) -> backend callback -> token exchange -> session -> app
 */
export const loginViaOidc = async (page: Page) => {
  await page.goto('/')
  const textarea = page.locator('textarea')
  await expect(textarea).toBeVisible({ timeout: 30_000 })
}

/**
 * SAML flow: / -> AuthGate -> /sso-redirect -> POST sign-in/sso -> mock IdP /saml/sso
 * (auto-generates SAMLResponse) -> POST to ACS -> session -> app
 */
export const loginViaSaml = async (page: Page) => {
  await page.goto('/')
  const textarea = page.locator('textarea')
  await expect(textarea).toBeVisible({ timeout: 30_000 })
}

/**
 * Open the account popover, click "Log out", confirm in the modal, and wait
 * for the signed-out landing page to appear.
 *
 * Expects the caller to have already authenticated (e.g. via loginViaOidc / loginViaSaml).
 */
export const logoutViaSidebar = async (page: Page, option: 'keep' | 'delete' = 'keep') => {
  // Open account popover in sidebar footer
  const accountTrigger = page.locator('[data-sidebar="footer"]').getByRole('button').first()
  await accountTrigger.click()

  // Click "Log out" menu item
  await page.getByText('Log out', { exact: true }).click()

  // Pick the data option if "delete" is requested (default is "keep")
  if (option === 'delete') {
    await page.getByText('Delete data from device').click()
  }

  // Confirm logout
  await page.getByRole('button', { name: 'Log out' }).click()

  // Should land on the signed-out page
  await expect(page.getByRole('heading', { name: 'Signed Out' })).toBeVisible({ timeout: 10_000 })
}

/** Shape of a company agent card seeded via the DEV-only test seam. Mirrors
 *  `shared/agent-cards.ts` `AgentCard` (kept local so the e2e helper has no app
 *  import). */
export type SeedAgentCard = {
  id: string
  name: string
  icon: string
  description: string
  category: 'sealed' | 'extensible'
  capabilities: { label: string; credentialMode?: 'as_you' | 'service_account'; connected?: boolean }[]
  advertisedModels: string[]
  managedBy: string
  grantedVia: string
}

/**
 * Seed the device-local `team_agents_cache` via the DEV-only window seam
 * (`src/devtools/test-seed.ts`). There is no live member discovery client in v1,
 * so this is the only way an e2e spec can make a company agent visible in the
 * selector / Agents page. Waits for the seam to be installed (it attaches after
 * the DB registers post-login), then replaces the cache wholesale.
 */
export const seedTeamAgents = async (page: Page, cards: SeedAgentCard[]) => {
  await page.waitForFunction(() => !!window.__thunderboltTestSeed, undefined, { timeout: 15_000 })
  await page.evaluate((seedCards) => window.__thunderboltTestSeed!.seedTeamAgents(seedCards), cards)
}

/** Clear the device-local team-agents cache — simulates a TOTAL grant
 *  revocation (invariant I4) via the DEV-only seam. */
export const revokeTeamAgents = async (page: Page) => {
  await page.waitForFunction(() => !!window.__thunderboltTestSeed, undefined, { timeout: 15_000 })
  await page.evaluate(() => window.__thunderboltTestSeed!.clearTeamAgents())
}

/**
 * Collect uncaught JS errors, filtering Tauri-specific noise.
 */
export const collectPageErrors = (page: Page): string[] => {
  const errors: string[] = []
  page.on('pageerror', (error) => {
    if (
      !error.message.includes('__TAURI__') &&
      !error.message.includes('tauri') &&
      !error.message.includes('window.__TAURI_INTERNALS__') &&
      !error.message.includes('convertFileSrc')
    ) {
      errors.push(error.message)
    }
  })
  return errors
}
