/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * THE FROZEN CONTRACT for team (company) agent discovery — PRD Rev 3.2, Stage 1.
 *
 * `AgentCard` is the grant-filtered descriptor an org registry returns for a
 * team agent. Stage 2 fixtures and Stage 3 discovery implement this EXACT
 * shape; the frontend caches cards device-locally (`team_agents_cache`) and
 * never syncs them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INVARIANT 2 — CARDS ARE DISPLAY-ONLY. NO FIELD MAY BE CAPABLE OF CARRYING
 * INSTRUCTIONS, PROMPTS, OR TOOL WIRING.
 *
 * A card describes an agent (identity, category, human-readable capability
 * labels, model names, provenance) so the client can render a picker entry.
 * It must never transport behavior: no system prompts, no instruction text,
 * no tool definitions/endpoints, no MCP wiring, no config blobs. Adding any
 * such field is a contract violation — the key-set contract test in
 * `agent-cards.test.ts` fails CI on ANY key addition so the change gets
 * reviewed against this invariant before it can land.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** One human-readable capability line on a card (e.g. "Search Confluence").
 *  `label` is display copy only — never an identifier the client executes.
 *  `credentialMode` says whose credentials the capability runs under;
 *  `connected` reflects whether the user has linked an `as_you` credential. */
export type AgentCardCapability = {
  label: string
  credentialMode?: 'as_you' | 'service_account'
  connected?: boolean
}

/** Grant-filtered team agent descriptor. Display-only — see INVARIANT 2 above. */
export type AgentCard = {
  id: string
  name: string
  icon: string
  description: string
  /** `sealed` agents run exactly as the org configured them; `extensible`
   *  agents accept user-side additions where org policy allows. */
  category: 'sealed' | 'extensible'
  capabilities: AgentCardCapability[]
  /** Model NAMES the agent advertises (display copy), not model configs. */
  advertisedModels: string[]
  /** Display name of the org/team that manages the agent. */
  managedBy: string
  /** Display name of the grant that made this card visible to the user. */
  grantedVia: string
}

/** Org-wide policy delivered alongside the cards in the discovery envelope.
 *  Cached device-locally; `defaultOrgPolicy` applies in consumer/no-org mode. */
export type OrgPolicy = {
  personalAgentPolicy: 'all' | 'no_native' | 'company_only'
  userModelsAllowed: boolean
  /** Org policy for user-added MCP servers (and extensions when addable), per
   *  P0-8: `allow` (unrestricted), `allowlist` (only `mcpAllowlist` entries —
   *  the launch default), or `block` (none). `mcpAllowlist` applies only in
   *  `allowlist` mode. */
  mcpPolicy: 'allow' | 'allowlist' | 'block'
  mcpAllowlist: string[]
}

/** Envelope returned by org agent discovery (Stage 3 endpoint). */
export type DiscoveryResponse = {
  agents: AgentCard[]
  policy: OrgPolicy
}

/** Policy used when no org policy is cached (consumer / no-org mode). */
export const defaultOrgPolicy: OrgPolicy = {
  personalAgentPolicy: 'all',
  userModelsAllowed: true,
  // No-org / consumer mode is unrestricted; an org's launch default is `allowlist`.
  mcpPolicy: 'allow',
  mcpAllowlist: [],
}
