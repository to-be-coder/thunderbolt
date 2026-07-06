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
import { createAdminApi, type AdminApi } from './admin-client'
import type { AgentInput, AgentPatch, GrantInput, OrgPolicy } from './types'

export const adminKeys = {
  me: ['admin', 'me'] as const,
  members: ['admin', 'members'] as const,
  groups: ['admin', 'groups'] as const,
  groupMembers: (groupId: string) => ['admin', 'groups', groupId, 'members'] as const,
  agents: ['admin', 'agents'] as const,
  grants: ['admin', 'grants'] as const,
  policy: ['admin', 'policy'] as const,
  audit: (action?: string) => ['admin', 'audit', action ?? 'all'] as const,
}

/** Memoized admin API bound to the app's authenticated HTTP client. */
export const useAdminApi = (): AdminApi => {
  const httpClient = useHttpClient()
  return useMemo(() => createAdminApi(httpClient), [httpClient])
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

// ── Agents ──────────────────────────────────────────────────────────────────

export const useAgents = () => {
  const api = useAdminApi()
  return useQuery({ queryKey: adminKeys.agents, queryFn: api.listAgents })
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
