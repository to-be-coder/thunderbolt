/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Elysia } from 'elysia'
import type { DiscoveryResponse } from '@shared/agent-cards'
import type { ServiceDeps } from '../lib/context'
import { authorizeMember } from '../lib/context'
import { getCapabilitiesForAgents, getLiveAgentById } from '../agents/dal'
import { resolveVisibleAgents } from '../grants/grant-math'
import { getOrgPolicy } from '../policy/dal'
import { buildAgentCard, type SafeCapability } from './build-card'

/**
 * THE DISCOVERY ENDPOINT (T6) — the grant-filtered, member-facing card feed.
 *
 *   GET /admin/discovery → DiscoveryResponse (shared/agent-cards.ts)
 *
 * Resolves caller → live member → groups → grants → the AgentCards they may see,
 * plus the OrgPolicy envelope. Unauthenticated/anonymous → 401; an authenticated
 * caller who is not an active member → 403 (so the client's clear-on-403 path
 * fires and the device-local team_agents_cache is dropped). A 200 always returns
 * the COMPLETE card set (never a delta) — the client swaps its cache wholesale,
 * which is how grant revocation propagates on the next fetch (T7).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ACP INVOKER-IDENTITY FINDING (blocking question, resolved from code — shapes
 * Stage 4 `credentialMode:'as_you'`):
 *
 * For EXTERNAL team agents (`team_agents.acp_url`) the ACP transport is
 * SERVICE-IDENTITY-ONLY. The universal WS relay (`backend/src/proxy/ws.ts`)
 * strips every `thunderbolt.*` / `tbproxy.*` subprotocol (including the invoker's
 * signed bearer) before opening the upstream socket — it authenticates the
 * downstream user, then opens an ANONYMOUS connection to the external ACP
 * endpoint. No user id/email/token is forwarded upstream. Invoker pass-through
 * exists ONLY for `managed-acp` agents hosted on Thunderbolt's own backend
 * (`resolveManagedAcpFactory` attaches the invoker's bearer, and the backend
 * authenticates the upgrade as that user).
 *
 * Consequence: `credentialMode:'as_you'` has NO transport support today for
 * external agents. Stage 3 discovery may still EMIT the mode as admin-authored
 * metadata (the card contract models `credentialMode` + `connected`), but
 * `as_you` is aspirational until Stage 4 grows a per-user credential-injection
 * hook on the relay (or a per-user upstream auth handshake). The conservative
 * default is service identity. Wire the real `as_you` behavior HERE-adjacent in
 * Stage 4, where the card's per-user `connected` flag is resolved.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const createDiscoveryRoutes = (deps: ServiceDeps) =>
  new Elysia({ name: 'admin-discovery', prefix: '/admin/discovery' }).get(
    '/',
    async ({ request, set }): Promise<DiscoveryResponse | { error: string; code?: string }> => {
      const authz = await authorizeMember(deps, request.headers)
      if (!authz.ok) {
        set.status = authz.status
        return authz.body
      }

      const visible = await resolveVisibleAgents(deps.db, authz.value.id)
      const capabilities = await getCapabilitiesForAgents(
        deps.db,
        visible.map((entry) => entry.agentId),
      )
      const capabilitiesByAgent = groupCapabilities(capabilities)

      const cards = []
      for (const entry of visible) {
        const agent = await getLiveAgentById(deps.db, entry.agentId)
        if (!agent) {
          continue
        }
        // Whitelisted safe fields ONLY — never spread the row (INVARIANT 2).
        cards.push(
          buildAgentCard(
            {
              id: agent.id,
              name: agent.name,
              icon: agent.icon,
              description: agent.description,
              category: agent.category,
              managedBy: agent.managedBy,
              advertisedModels: agent.advertisedModels,
            },
            capabilitiesByAgent.get(agent.id) ?? [],
            entry.grantedVia,
          ),
        )
      }

      const policy = await getOrgPolicy(deps.db)
      return { agents: cards, policy }
    },
  )

/** Group capability rows by agent, ordered by `position`, into the card-safe shape. */
const groupCapabilities = (
  capabilities: { agentId: string; label: string; credentialMode: 'as_you' | 'service_account' | null; position: string }[],
): Map<string, SafeCapability[]> => {
  const byAgent = new Map<string, { label: string; credentialMode: 'as_you' | 'service_account' | null; position: string }[]>()
  for (const capability of capabilities) {
    const list = byAgent.get(capability.agentId) ?? []
    list.push(capability)
    byAgent.set(capability.agentId, list)
  }
  const result = new Map<string, SafeCapability[]>()
  for (const [agentId, list] of byAgent) {
    const sorted = [...list].sort((a, b) => Number(a.position) - Number(b.position))
    result.set(
      agentId,
      sorted.map((capability) => ({ label: capability.label, credentialMode: capability.credentialMode })),
    )
  }
  return result
}
