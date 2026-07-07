/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * React Query hooks over {@link createAdminApi}. The admin tables are NOT
 * PowerSync-synced, so this uses plain `@tanstack/react-query` (server cache),
 * not the PowerSync reactive-query variant. Every mutation invalidates the
 * relevant list AND the audit log — a mutation is only "done" once the audit
 * trail (S6) reflects it.
 */

import { useHttpClient } from '@/contexts'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useMemo } from 'react'
import { isDemoMode } from '@/lib/demo-mode'
import { createAdminApi, type AdminApi } from './admin-client'
import { createDemoAdminApi } from './demo-admin-api'
import type { AgentInput, AgentPatch, GrantInput, OrgPolicy } from './types'

/** Lazily-built singleton demo API so its in-memory store survives re-renders. */
let demoApi: AdminApi | null = null
const getDemoAdminApi = (): AdminApi => (demoApi ??= createDemoAdminApi())

export const adminKeys = {
  me: ['admin', 'me'] as const,
  members: ['admin', 'members'] as const,
  groups: ['admin', 'groups'] as const,
  groupMembers: (groupId: string) => ['admin', 'groups', groupId, 'members'] as const,
  memberGroups: (memberId: string) => ['admin', 'members', memberId, 'groups'] as const,
  memberAgents: (memberId: string) => ['admin', 'members', memberId, 'agents'] as const,
  agents: ['admin', 'agents'] as const,
  agentEndpoint: (acpUrl: string) => ['admin', 'agents', 'endpoint', acpUrl] as const,
  agentStatus: (acpUrl: string) => ['admin', 'agents', 'status', acpUrl] as const,
  grants: ['admin', 'grants'] as const,
  policy: ['admin', 'policy'] as const,
  audit: (action?: string) => ['admin', 'audit', action ?? 'all'] as const,
}

/** Memoized admin API bound to the app's authenticated HTTP client. In demo
 *  mode it returns the in-memory demo API instead, so the console runs with no
 *  admin-service backend. */
export const useAdminApi = (): AdminApi => {
  const httpClient = useHttpClient()
  return useMemo(() => (isDemoMode() ? getDemoAdminApi() : createAdminApi(httpClient)), [httpClient])
}

/** Shared mutation-success invalidator: refresh the given lists + the audit log. */
const useInvalidate = () => {
  const queryClient = useQueryClient()
  return (keys: QueryKey[]) =>
    Promise.all([...keys, adminKeys.audit()].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

// ── Identity ────────────────────────────────────────────────────────────────

export const useAdminIdentity = () => {
  const api = useAdminApi()
  return useQuery({ queryKey: adminKeys.me, queryFn: api.getMe, retry: false, staleTime: 60_000 })
}

// ── Members ─────────────────────────────────────────────────────────────────

export const useMembers = () => {
  const api = useAdminApi()
  return useQuery({ queryKey: adminKeys.members, queryFn: api.listMembers })
}

export const useInviteMember = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { email: string; isAdmin?: boolean }) => api.inviteMember(input),
    onSuccess: () => invalidate([adminKeys.members]),
  })
}

export const useRemoveMember = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.removeMember(id),
    onSuccess: () => invalidate([adminKeys.members, adminKeys.groups, adminKeys.grants]),
  })
}

export const useSetMemberAdmin = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) => api.setMemberAdmin(id, isAdmin),
    onSuccess: () => invalidate([adminKeys.members]),
  })
}

/** The groups a member currently belongs to (for the member detail panel). */
export const useMemberGroups = (memberId: string | null) => {
  const api = useAdminApi()
  return useQuery({
    queryKey: adminKeys.memberGroups(memberId ?? ''),
    queryFn: () => api.listMemberGroups(memberId ?? ''),
    enabled: memberId !== null,
  })
}

/** The agents a member can access (via grants) — for the member detail panel. */
export const useMemberAgents = (memberId: string | null) => {
  const api = useAdminApi()
  return useQuery({
    queryKey: adminKeys.memberAgents(memberId ?? ''),
    queryFn: () => api.listMemberAgents(memberId ?? ''),
    enabled: memberId !== null,
  })
}

// ── Groups ──────────────────────────────────────────────────────────────────

export const useGroups = () => {
  const api = useAdminApi()
  return useQuery({ queryKey: adminKeys.groups, queryFn: api.listGroups })
}

export const useGroupMembers = (groupId: string | null) => {
  const api = useAdminApi()
  return useQuery({
    queryKey: adminKeys.groupMembers(groupId ?? ''),
    queryFn: () => api.listGroupMembers(groupId ?? ''),
    enabled: groupId !== null,
  })
}

export const useCreateGroup = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (name: string) => api.createGroup(name),
    onSuccess: () => invalidate([adminKeys.groups]),
  })
}

export const useDeleteGroup = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.deleteGroup(id),
    onSuccess: () => invalidate([adminKeys.groups, adminKeys.grants]),
  })
}

export const useAddGroupMember = (groupId: string) => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (memberId: string) => api.addGroupMember(groupId, memberId),
    onSuccess: () => invalidate([adminKeys.groupMembers(groupId)]),
  })
}

export const useRemoveGroupMember = (groupId: string) => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (memberId: string) => api.removeGroupMember(groupId, memberId),
    onSuccess: () => invalidate([adminKeys.groupMembers(groupId)]),
  })
}

/** Add or remove a member from an arbitrary group — drives the multi-select in
 *  the member detail panel (a member can belong to many groups). */
export const useSetMemberGroup = (memberId: string) => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ groupId, member }: { groupId: string; member: boolean }) =>
      member ? api.addGroupMember(groupId, memberId) : api.removeGroupMember(groupId, memberId),
    onSuccess: (_result, { groupId }) =>
      invalidate([adminKeys.memberGroups(memberId), adminKeys.groupMembers(groupId), adminKeys.memberAgents(memberId)]),
  })
}

// ── Agents ──────────────────────────────────────────────────────────────────

export const useAgents = () => {
  const api = useAdminApi()
  return useQuery({ queryKey: adminKeys.agents, queryFn: api.listAgents })
}

/** Admin-only live descriptor for one agent's ACP endpoint (models, MCP, tools,
 *  credentials). Fetched on demand; never persisted or synced to members. */
export const useAgentEndpointDetail = (acpUrl: string | undefined) => {
  const api = useAdminApi()
  return useQuery({
    queryKey: adminKeys.agentEndpoint(acpUrl ?? ''),
    queryFn: () => api.describeEndpoint(acpUrl ?? ''),
    enabled: acpUrl !== undefined && acpUrl !== '',
    staleTime: 60_000,
  })
}

/** Live connection state of an agent's ACP endpoint (Ready / Needs auth / … ).
 *  Fetched fresh; never stored. Drives the registry status line. */
export const useAgentConnectionStatus = (acpUrl: string | undefined) => {
  const api = useAdminApi()
  return useQuery({
    queryKey: adminKeys.agentStatus(acpUrl ?? ''),
    queryFn: () => api.agentStatus(acpUrl ?? ''),
    enabled: acpUrl !== undefined && acpUrl !== '',
    staleTime: 30_000,
  })
}

export const useCreateAgent = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: AgentInput) => api.createAgent(input),
    onSuccess: () => invalidate([adminKeys.agents]),
  })
}

export const useUpdateAgent = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AgentPatch }) => api.updateAgent(id, patch),
    onSuccess: () => invalidate([adminKeys.agents]),
  })
}

export const useDeleteAgent = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.deleteAgent(id),
    onSuccess: () => invalidate([adminKeys.agents, adminKeys.grants]),
  })
}

// ── Grants ──────────────────────────────────────────────────────────────────

export const useGrants = () => {
  const api = useAdminApi()
  return useQuery({ queryKey: adminKeys.grants, queryFn: api.listGrants })
}

export const useCreateGrant = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: GrantInput) => api.createGrant(input),
    onSuccess: () => invalidate([adminKeys.grants]),
  })
}

export const useRevokeGrant = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.revokeGrant(id),
    onSuccess: () => invalidate([adminKeys.grants]),
  })
}

// ── Policy ──────────────────────────────────────────────────────────────────

export const usePolicy = () => {
  const api = useAdminApi()
  return useQuery({ queryKey: adminKeys.policy, queryFn: api.getPolicy })
}

export const useSavePolicy = () => {
  const api = useAdminApi()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (policy: OrgPolicy) => api.putPolicy(policy),
    onSuccess: () => invalidate([adminKeys.policy]),
  })
}

// ── Audit ───────────────────────────────────────────────────────────────────

export const useAudit = (action?: string) => {
  const api = useAdminApi()
  return useQuery({
    queryKey: adminKeys.audit(action),
    queryFn: () => api.listAudit(action ? { action } : undefined),
  })
}
