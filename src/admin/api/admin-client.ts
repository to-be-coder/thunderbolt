/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The single, exclusive front-end funnel for the `/v1/admin/*` HTTP contract.
 *
 * Every admin-console network call goes through one of these thin wrappers over
 * the app's authenticated {@link HttpClient} (relative paths resolve against the
 * `cloudUrl` prefix, i.e. `.../v1`). This is the boundary that keeps later
 * extraction of the admin-service a deployment change, not a refactor: the
 * console talks only HTTP here, never admin-service internals.
 */

import type { HttpClient } from '@/contexts'
import type {
  AdminIdentity,
  AgentConnectionState,
  AgentEndpointDetail,
  AgentInput,
  AgentPatch,
  AuditEvent,
  CompanySkill,
  CompanySkillInput,
  ConnectionTestResult,
  Grant,
  GrantInput,
  Group,
  Member,
  OrgPolicy,
  TeamAgent,
  TeamAgentWithCapabilities,
} from './types'

export type AdminApi = ReturnType<typeof createAdminApi>

/** Build the typed admin API bound to an {@link HttpClient} instance. */
export const createAdminApi = (httpClient: HttpClient) => ({
  // Identity
  getMe: () => httpClient.get('admin/me').json<AdminIdentity>(),

  // Members
  listMembers: () => httpClient.get('admin/members').json<Member[]>(),
  inviteMember: (input: { email: string; isAdmin?: boolean }) =>
    httpClient.post('admin/members', { json: input }).json<Member>(),
  removeMember: (id: string) => httpClient.delete(`admin/members/${id}`).json<{ success: true }>(),
  setMemberAdmin: (id: string, isAdmin: boolean) =>
    httpClient.patch(`admin/members/${id}`, { json: { isAdmin } }).json<Member>(),
  listMemberGroups: (id: string) => httpClient.get(`admin/members/${id}/groups`).json<Group[]>(),
  // Agents the member can access — resolved from their grants (direct, via a
  // group they're in, or org-wide "everyone").
  listMemberAgents: (id: string) => httpClient.get(`admin/members/${id}/agents`).json<{ id: string; name: string }[]>(),

  // Company skills (org-scoped Library the admin curates)
  listCompanySkills: () => httpClient.get('admin/skills').json<CompanySkill[]>(),
  createCompanySkill: (input: CompanySkillInput) =>
    httpClient.post('admin/skills', { json: input }).json<CompanySkill>(),
  deleteCompanySkill: (id: string) => httpClient.delete(`admin/skills/${id}`).json<{ success: true }>(),

  // Groups
  listGroups: () => httpClient.get('admin/groups').json<Group[]>(),
  createGroup: (name: string) => httpClient.post('admin/groups', { json: { name } }).json<Group>(),
  deleteGroup: (id: string) => httpClient.delete(`admin/groups/${id}`).json<{ success: true }>(),
  listGroupMembers: (groupId: string) => httpClient.get(`admin/groups/${groupId}/members`).json<Member[]>(),
  addGroupMember: (groupId: string, memberId: string) =>
    httpClient.post(`admin/groups/${groupId}/members`, { json: { memberId } }).json<{ success: true }>(),
  removeGroupMember: (groupId: string, memberId: string) =>
    httpClient.delete(`admin/groups/${groupId}/members/${memberId}`).json<{ success: true }>(),

  // Agents
  listAgents: () => httpClient.get('admin/agents').json<TeamAgentWithCapabilities[]>(),
  createAgent: (input: AgentInput) => httpClient.post('admin/agents', { json: input }).json<TeamAgent>(),
  updateAgent: (id: string, patch: AgentPatch) =>
    httpClient.patch(`admin/agents/${id}`, { json: patch }).json<TeamAgent>(),
  deleteAgent: (id: string) => httpClient.delete(`admin/agents/${id}`).json<{ success: true }>(),
  testConnection: (acpUrl: string) =>
    httpClient.post('admin/agents/connection-test', { json: { acpUrl } }).json<ConnectionTestResult>(),
  // Admin-only live descriptor — fetched fresh, never persisted or synced.
  describeEndpoint: (acpUrl: string) =>
    httpClient.post('admin/agents/describe', { json: { acpUrl } }).json<AgentEndpointDetail>(),
  // Live connection state of the endpoint (Ready / Needs auth / Error / …).
  agentStatus: (acpUrl: string) =>
    httpClient.post('admin/agents/status', { json: { acpUrl } }).json<{ state: AgentConnectionState }>(),
  // Passive connection-failure report (spec §3) — record + deduped summary.
  recordConnectionFailure: (input: { agentId: string; memberId: string; errorKind: string }) =>
    httpClient.post('admin/agents/connection-failures', { json: input }).json<{ success: true }>(),
  listConnectionFailures: (agentId: string) =>
    httpClient.get(`admin/agents/${agentId}/connection-failures`).json<{ count: number; since: string | null }>(),

  // Grants
  listGrants: () => httpClient.get('admin/grants').json<Grant[]>(),
  createGrant: (input: GrantInput) => httpClient.post('admin/grants', { json: input }).json<Grant>(),
  revokeGrant: (id: string) => httpClient.delete(`admin/grants/${id}`).json<{ success: true }>(),

  // Policy
  getPolicy: () => httpClient.get('admin/policy').json<OrgPolicy>(),
  putPolicy: (policy: OrgPolicy) => httpClient.put('admin/policy', { json: policy }).json<OrgPolicy>(),

  // Audit
  listAudit: (params?: { action?: string; limit?: number }) =>
    httpClient
      .get('admin/audit', {
        searchParams: {
          ...(params?.action ? { action: params.action } : {}),
          ...(params?.limit ? { limit: params.limit } : {}),
        },
      })
      .json<AuditEvent[]>(),
})
