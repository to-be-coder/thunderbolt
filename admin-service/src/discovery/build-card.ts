/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AgentCard, AgentCardCapability } from '@shared/agent-cards'

/**
 * The ONLY team-agent columns allowed to shape a served card (INVARIANT 2).
 *
 * The card builder reads from THIS whitelist, field by field — it never spreads
 * a `team_agents` row. That is the enforced guarantee: a future column on
 * `team_agents` (e.g. `instructions`, a system prompt, tool wiring) cannot leak
 * into the display-only card, because a new column is simply not on this type
 * and the builder never copies unknown keys. The colocated contract test
 * (`build-card.test.ts`) fails if it ever does.
 */
export type SafeAgentFields = {
  id: string
  name: string
  icon: string
  description: string
  category: 'sealed' | 'extensible'
  managedBy: string
  advertisedModels: string[]
}

/** Admin-authored capability line — plain-language `label`, never a skill name. */
export type SafeCapability = {
  label: string
  credentialMode: 'as_you' | 'service_account' | null
}

/**
 * Build a display-only {@link AgentCard} from whitelisted safe fields. Every key
 * is assigned explicitly; nothing is spread from the source row. `connected` is
 * intentionally omitted — it reflects a per-user `as_you` credential link, which
 * is Stage 4.
 */
export const buildAgentCard = (
  agent: SafeAgentFields,
  capabilities: SafeCapability[],
  grantedVia: string,
): AgentCard => ({
  id: agent.id,
  name: agent.name,
  icon: agent.icon,
  description: agent.description,
  category: agent.category,
  capabilities: capabilities.map(toCardCapability),
  advertisedModels: agent.advertisedModels,
  managedBy: agent.managedBy,
  grantedVia,
})

const toCardCapability = (capability: SafeCapability): AgentCardCapability =>
  capability.credentialMode === null
    ? { label: capability.label }
    : { label: capability.label, credentialMode: capability.credentialMode }
