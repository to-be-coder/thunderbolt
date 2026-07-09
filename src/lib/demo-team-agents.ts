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
  /** Abstracted MCP tool-server kinds (never endpoints). */
  mcpKinds: string[]
  toolKinds: string[]
  accepts: string[]
  modes: string[]
  /** Count of the agent's OWN bundled skills (count only — never names). */
  agentSkillCount: number
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
    mcpKinds: ['Sales knowledge base'],
    toolKinds: ['read', 'edit', 'fetch'],
    accepts: ['images', 'context'],
    modes: ['Ask', 'Auto-edit', 'Autonomous'],
    agentSkillCount: 5,
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
    mcpKinds: ['Finance knowledge base'],
    toolKinds: ['read'],
    accepts: [],
    modes: ['Ask'],
    agentSkillCount: 3,
    capabilities: [{ label: 'Reads the Finance knowledge base', credentialMode: 'service_account' }],
  },
  {
    id: 'demo-support-agent',
    name: 'Support Assistant',
    icon: 'headphones',
    description: 'Triages tickets, drafts replies, and answers from the help-desk knowledge base.',
    acpUrl: 'wss://agents.demo.thunderbolt/support',
    category: 'extensible',
    managedBy: 'Demo IT',
    grantedVia: 'Support (group)',
    advertisedModels: ['claude-opus-4-8', 'claude-haiku-4-5'],
    integrations: ['Zendesk', 'Web search'],
    mcpKinds: ['Support knowledge base'],
    toolKinds: ['read', 'edit', 'fetch'],
    accepts: ['images', 'context'],
    modes: ['Ask', 'Auto-edit'],
    agentSkillCount: 4,
    capabilities: [
      { label: 'Searches the web' },
      { label: 'Reads the Support knowledge base', credentialMode: 'service_account' },
      { label: 'Replies in the ticketing system', credentialMode: 'as_you' },
    ],
  },
  {
    id: 'demo-marketing-agent',
    name: 'Marketing Copywriter',
    icon: 'pen',
    description: 'Writes on-brand campaigns, social posts, and landing-page copy.',
    acpUrl: 'wss://agents.demo.thunderbolt/marketing',
    category: 'extensible',
    managedBy: 'Demo IT',
    grantedVia: 'Marketing (group)',
    advertisedModels: ['claude-opus-4-8'],
    integrations: ['Web search', 'Google Drive'],
    mcpKinds: ['Brand guidelines'],
    toolKinds: ['read', 'edit', 'fetch'],
    accepts: ['images', 'context'],
    modes: ['Ask', 'Auto-edit'],
    agentSkillCount: 6,
    capabilities: [
      { label: 'Searches the web' },
      { label: 'Reads the brand guidelines', credentialMode: 'service_account' },
    ],
  },
  {
    id: 'demo-code-review',
    name: 'Code Reviewer',
    icon: 'code',
    description: 'Reviews pull requests for bugs, style, and security before merge.',
    acpUrl: 'wss://agents.demo.thunderbolt/code-review',
    category: 'sealed',
    managedBy: 'Demo IT',
    grantedVia: 'Engineering (group)',
    advertisedModels: ['claude-opus-4-8'],
    integrations: ['GitHub'],
    mcpKinds: ['Code search'],
    toolKinds: ['read', 'fetch'],
    accepts: ['context'],
    modes: ['Ask'],
    agentSkillCount: 2,
    capabilities: [
      { label: 'Reads the repository', credentialMode: 'service_account' },
      { label: 'Comments on pull requests', credentialMode: 'as_you' },
    ],
  },
  {
    id: 'demo-data-analyst',
    name: 'Data Analyst',
    icon: 'database',
    description: 'Answers questions over the analytics warehouse and drafts SQL.',
    acpUrl: 'wss://agents.demo.thunderbolt/analytics',
    category: 'extensible',
    managedBy: 'Demo IT',
    grantedVia: 'Everyone',
    advertisedModels: ['claude-opus-4-8', 'claude-haiku-4-5'],
    integrations: ['Analytics warehouse'],
    mcpKinds: ['Analytics warehouse'],
    toolKinds: ['read', 'fetch'],
    accepts: ['context'],
    modes: ['Ask', 'Auto-edit'],
    agentSkillCount: 3,
    capabilities: [{ label: 'Queries the analytics warehouse', credentialMode: 'service_account' }],
  },
  {
    id: 'demo-people-ops',
    name: 'People Ops',
    icon: 'users',
    description: 'Answers HR and benefits questions from the company handbook.',
    acpUrl: 'wss://agents.demo.thunderbolt/people-ops',
    category: 'sealed',
    managedBy: 'Demo IT',
    grantedVia: 'Everyone',
    advertisedModels: ['claude-haiku-4-5'],
    integrations: ['HR handbook'],
    mcpKinds: ['HR knowledge base'],
    toolKinds: ['read'],
    accepts: [],
    modes: ['Ask'],
    agentSkillCount: 1,
    capabilities: [{ label: 'Reads the HR handbook', credentialMode: 'service_account' }],
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
    advertisedModels: ['claude-haiku-4-5'],
    integrations: [],
    mcpKinds: [],
    toolKinds: [],
    accepts: [],
    modes: [],
    agentSkillCount: 0,
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
  mcpKinds: def.mcpKinds,
  toolKinds: def.toolKinds,
  accepts: def.accepts,
  modes: def.modes,
  agentSkillCount: def.agentSkillCount,
  managedBy: def.managedBy,
  grantedVia: def.grantedVia,
})
