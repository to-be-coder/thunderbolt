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

export type GrantTargetType = 'group' | 'everyone' | 'member'

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
