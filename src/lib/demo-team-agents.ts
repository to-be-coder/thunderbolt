/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AgentCard, AgentCardCapability } from '@shared/agent-cards'

/**
 * The ONE canonical definition of each demo team agent. Both surfaces project
 * from it — the member team-cache seed (`useDemoSeed`) and the in-memory admin
 * registry (`createDemoAdminApi`) — so an agent has ONE identity and ONE set of
 * card fields across admin and member. That's what makes the admin's member-card
 * preview byte-identical to what a member sees.
 */
export type DemoTeamAgentDef = {
  id: string
  name: string
  icon: string
  description: string
  /** Failing/sentinel endpoints live here; the member card never exposes it. */
  acpUrl: string
  category: AgentCard['category']
  managedBy: string
  grantedVia: string
  advertisedModels: string[]
  integrations: string[]
  toolKinds: string[]
  accepts: string[]
  modes: string[]
  capabilities: AgentCardCapability[]
}

/** Sentinel endpoint whose probe + session-start connection ALWAYS fail (§6 of
 *  the connection-health spec) — kept here so both seeds agree on it. */
export const FLAKY_ACP_URL = 'wss://agents.demo.thunderbolt/flaky'

export const demoTeamAgentDefs: DemoTeamAgentDef[] = [
  {
    id: 'demo-sales-agent',
    name: 'Sales Agent',
    icon: 'chart',
    description: 'Drafts outreach, summarizes accounts, and answers pipeline questions.',
    acpUrl: 'wss://agents.demo.thunderbolt/sales',
    category: 'extensible',
    managedBy: 'Demo IT',
    grantedVia: 'Sales (group)',
    advertisedModels: ['claude-opus-4-8', 'claude-haiku-4-5'],
    integrations: ['Salesforce', 'Web search'],
    toolKinds: ['read', 'edit', 'fetch'],
    accepts: ['images', 'context'],
    modes: ['Ask', 'Auto-edit', 'Autonomous'],
    capabilities: [
      { label: 'Searches the web' },
      { label: 'Reads the Sales knowledge base', credentialMode: 'service_account' },
      { label: 'Acts as you in the CRM', credentialMode: 'as_you' },
    ],
  },
  {
    id: 'demo-finance-kb',
    name: 'Finance KB',
    icon: 'book',
    description: 'Answers questions from the finance knowledge base.',
    acpUrl: 'wss://agents.demo.thunderbolt/finance',
    category: 'sealed',
    managedBy: 'Demo IT',
    grantedVia: 'Finance (group)',
    advertisedModels: ['claude-opus-4-8'],
    integrations: ['Finance data warehouse'],
    toolKinds: ['read'],
    accepts: [],
    modes: ['Ask'],
    capabilities: [{ label: 'Reads the Finance knowledge base', credentialMode: 'service_account' }],
  },
  {
    id: 'demo-flaky-agent',
    name: 'Flaky Test Agent',
    icon: 'bug',
    description: 'A demo agent whose endpoint always fails to connect — used to review the connection-failure states.',
    acpUrl: FLAKY_ACP_URL,
    category: 'sealed',
    managedBy: 'Demo IT',
    grantedVia: 'Everyone',
    advertisedModels: [],
    integrations: [],
    toolKinds: [],
    accepts: [],
    modes: [],
    capabilities: [],
  },
]

/** Project a canonical def into the member-facing {@link AgentCard} — display
 *  only, no endpoint. This is exactly what a granted member sees. */
export const toAgentCard = (def: DemoTeamAgentDef): AgentCard => ({
  id: def.id,
  name: def.name,
  icon: def.icon,
  description: def.description,
  category: def.category,
  capabilities: def.capabilities,
  advertisedModels: def.advertisedModels,
  integrations: def.integrations,
  toolKinds: def.toolKinds,
  accepts: def.accepts,
  modes: def.modes,
  managedBy: def.managedBy,
  grantedVia: def.grantedVia,
})
