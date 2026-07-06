/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getDb } from '@/db/database'
import { clearTeamAgentsCache, replaceTeamAgentsCache } from '@/dal/team-agents-cache'
import { setOrgPolicy } from '@/dal/org-policy'
import type { AgentCard, OrgPolicy } from '@shared/agent-cards'

/**
 * DEV-ONLY end-to-end test seam. `team_agents_cache` / `org_policy` are
 * device-local PowerSync tables populated only by org discovery (no live member
 * discovery client exists in v1), so Playwright specs that need a company agent
 * visible in the selector / Agents page have no product path to create one. This
 * exposes a tiny window API to seed and clear those caches directly.
 *
 * Guarded behind `import.meta.env.DEV` at the (only) call site in `index.tsx`,
 * so Vite tree-shakes it out of production builds entirely — it can never ship.
 */
export type ThunderboltTestSeed = {
  /** Replace the device-local team-agents cache with the given cards. */
  seedTeamAgents: (cards: AgentCard[]) => Promise<void>
  /** Persist the device-local org policy (section gating). */
  seedOrgPolicy: (policy: OrgPolicy) => Promise<void>
  /** Drop the team-agents cache (simulates a total revocation — invariant I4). */
  clearTeamAgents: () => Promise<void>
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __thunderboltTestSeed?: ThunderboltTestSeed
  }
}

export const installTestSeed = (): void => {
  window.__thunderboltTestSeed = {
    seedTeamAgents: (cards) => replaceTeamAgentsCache(getDb(), cards),
    seedOrgPolicy: (policy) => setOrgPolicy(getDb(), policy),
    clearTeamAgents: () => clearTeamAgentsCache(getDb()),
  }
}
