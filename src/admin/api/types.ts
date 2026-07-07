/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * TypeScript shapes for the `/v1/admin/*` HTTP contract, mirrored on the front-end
 * side of the admin-service boundary. The console speaks ONLY HTTP to `/v1/admin`
 * — it never imports admin-service internals — so these local types (plus
 * `@shared/agent-cards`) are the entire dependency surface. Timestamps arrive as
 * ISO strings over the wire.
 */

export type MemberStatus = 'invited' | 'active'

export type Member = {
  id: string
  name: string
  email: string
  status: MemberStatus
  isAdmin: boolean
  createdAt: string
  deletedAt: string | null
}

/** The caller-identity payload from `GET /admin/me`, consumed by the admin gate. */
export type AdminIdentity = {
  id: string
  email: string
  status: MemberStatus
  isAdmin: boolean
}

export type Group = {
  id: string
  name: string
  createdAt: string
  deletedAt: string | null
}

export type AgentCategory = 'sealed' | 'extensible'
export type AgentStatus = 'draft' | 'published'
export type CredentialMode = 'as_you' | 'service_account'

export type AgentCapability = {
  id: string
  agentId: string
  label: string
  credentialMode: CredentialMode | null
  position: string
  createdAt: string
  deletedAt: string | null
}

export type TeamAgent = {
  id: string
  name: string
  icon: string
  description: string
  acpUrl: string
  category: AgentCategory
  status: AgentStatus
  managedBy: string
  advertisedModels: string[]
  /** Member-card fields (handshake-derived) the admin carries so its preview can
   *  render the EXACT member card. Abstracted kinds only — see `@shared/agent-cards`. */
  integrations?: string[]
  toolKinds?: string[]
  accepts?: string[]
  modes?: string[]
  createdAt: string
  deletedAt: string | null
}

export type TeamAgentWithCapabilities = TeamAgent & { capabilities: AgentCapability[] }

/** A capability line as authored in the registry form (pre-persist). */
export type CapabilityInput = { label: string; credentialMode?: CredentialMode }

export type AgentInput = {
  name: string
  icon?: string
  description?: string
  acpUrl: string
  category: AgentCategory
  status?: AgentStatus
  managedBy?: string
  advertisedModels?: string[]
  capabilities?: CapabilityInput[]
}

export type AgentPatch = Partial<AgentInput>

export type ConnectionTestResult = { reachable: true; name?: string } | { reachable: false; error: string }

/**
 * Live, admin-only technical descriptor fetched from an agent's ACP endpoint on
 * demand. This is the wiring the display-only card deliberately CANNOT carry
 * (INVARIANT 2 in `@shared/agent-cards`): it is never persisted on the team
 * agent and never synced to members — the admin console fetches it fresh when
 * an admin opens the agent's detail page.
 */
export type AgentEndpointDetail = {
  /** Model NAMES the endpoint runs (e.g. 'claude-opus-4-8'). */
  models: string[]
  /** MCP servers the agent is wired to (display names). */
  mcpServers: string[]
  /** Tool/function names the agent can invoke. */
  tools: string[]
  /** External credentials the agent uses, and whose identity they run under. */
  credentials: { label: string; mode: CredentialMode }[]
}

/**
 * Live connection state of a team agent's ACP endpoint, surfaced in the admin
 * registry. Fetched fresh, never stored. `connecting` is the client-side
 * in-flight state (the probe hasn't returned yet); the rest are what a probe of
 * the endpoint reports:
 *  - `ready`         — handshake done, auth satisfied, idle and promptable.
 *  - `working`       — mid-turn (optional; only if the list is a launch point).
 *  - `needs_auth`    — advertised auth methods, caller isn't authenticated.
 *  - `error`         — spawn/crash/protocol/transport failure.
 *  - `not_connected` — configured but never successfully handshaken.
 */
export type AgentConnectionState = 'ready' | 'working' | 'needs_auth' | 'error' | 'not_connected'

export type GrantTargetType = 'group' | 'everyone' | 'member' | 'admins'

export type Grant = {
  id: string
  agentId: string
  targetType: GrantTargetType
  targetId: string | null
  createdAt: string
  deletedAt: string | null
}

export type GrantInput = {
  agentId: string
  targetType: GrantTargetType
  targetId?: string
}

export type PersonalAgentPolicy = 'all' | 'no_native' | 'company_only'

export type McpPolicyMode = 'allow' | 'allowlist' | 'block'

export type OrgPolicy = {
  personalAgentPolicy: PersonalAgentPolicy
  userModelsAllowed: boolean
  /** P0-8: allow / allowlist (launch default) / block for user-added MCP servers. */
  mcpPolicy: McpPolicyMode
  mcpAllowlist: string[]
  /** Built-in extension ids blocked org-wide (empty = all allowed). */
  blockedExtensions: string[]
  /** OAuth integration provider ids blocked org-wide (empty = all allowed). */
  blockedIntegrations: string[]
}

export type AuditEvent = {
  id: string
  actor: string
  action: string
  target: string
  diff: Record<string, unknown>
  ts: string
}
