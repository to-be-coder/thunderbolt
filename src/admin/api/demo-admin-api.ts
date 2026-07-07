/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * In-memory {@link AdminApi} for prototype demo mode (see `@/lib/demo-mode`).
 *
 * Serves the same typed contract as the real HTTP-backed `createAdminApi`, but
 * against a per-instance in-memory store seeded with a small demo org (the app
 * memoizes one instance). Every mutation updates the store and writes an audit
 * row, so the six console screens are
 * fully clickable — invite a member, create a group, register + grant an agent,
 * revoke, edit policy — and the changes reflect immediately (for the session;
 * a reload re-seeds). Never imported unless `isDemoMode()` is true.
 */

import type { AdminApi } from './admin-client'
import type {
  AdminIdentity,
  AgentConnectionState,
  AgentEndpointDetail,
  AgentInput,
  AgentPatch,
  AuditEvent,
  Grant,
  GrantInput,
  Group,
  Member,
  OrgPolicy,
  TeamAgent,
  TeamAgentWithCapabilities,
} from './types'

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

/** Sentinel endpoint whose probe and session-start connection ALWAYS fail — the
 *  demo "Flaky Test Agent" so the connection-failure UX (Test → unreachable,
 *  Health count, member "reported to your admin" message) is demoable. */
export const FLAKY_ACP_URL = 'wss://agents.demo.thunderbolt/flaky'

/** A single agent-side connection failure at a member's session start (spec §3). */
type ConnectionFailure = { agentId: string; memberId: string; ts: string; errorKind: string }

type DemoStore = {
  members: Member[]
  groups: Group[]
  groupMembers: { groupId: string; memberId: string }[]
  agents: TeamAgentWithCapabilities[]
  grants: Grant[]
  policy: OrgPolicy
  audit: AuditEvent[]
  connectionFailures: ConnectionFailure[]
}

const seedStore = (): DemoStore => {
  const salesGroup: Group = { id: id(), name: 'Sales', createdAt: now(), deletedAt: null }
  const financeGroup: Group = { id: id(), name: 'Finance', createdAt: now(), deletedAt: null }
  const admin: Member = {
    id: id(),
    name: 'Demo Admin',
    email: 'admin@demo.thunderbolt',
    status: 'active',
    isAdmin: true,
    createdAt: now(),
    deletedAt: null,
  }
  const rae: Member = {
    id: id(),
    name: 'Rae Thompson',
    email: 'rae@demo.thunderbolt',
    status: 'active',
    isAdmin: false,
    createdAt: now(),
    deletedAt: null,
  }
  const jordan: Member = {
    id: id(),
    name: 'Jordan Lee',
    email: 'jordan@demo.thunderbolt',
    status: 'invited',
    isAdmin: false,
    createdAt: now(),
    deletedAt: null,
  }
  // A fuller roster so the Members table feels realistic — a mix of active /
  // invited and a couple of extra admins.
  const extraMembers: Member[] = [
    'Ava Chen',
    'Liam Patel',
    'Mia Rodriguez',
    'Noah Kim',
    'Sofia Nguyen',
    'Ethan Okafor',
    'Isabella Rossi',
    'Lucas Silva',
    'Amara Johnson',
    'Kai Tanaka',
    'Priya Sharma',
    'Diego Morales',
    'Zoe Anderson',
    'Omar Haddad',
    'Lily Zhang',
    'Marcus Brown',
    'Hana Suzuki',
    'Elena Popov',
    'Jamal Wright',
    'Nina Kowalski',
  ].map((name, index) => ({
    id: id(),
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@demo.thunderbolt`,
    status: index % 5 === 0 ? 'invited' : 'active',
    isAdmin: index === 3 || index === 11,
    createdAt: now(),
    deletedAt: null,
  }))

  const salesAgent: TeamAgentWithCapabilities = {
    id: id(),
    name: 'Sales Agent',
    icon: 'chart',
    description: 'Drafts outreach, summarizes accounts, and answers pipeline questions.',
    acpUrl: 'wss://agents.demo.thunderbolt/sales',
    category: 'extensible',
    status: 'published',
    managedBy: 'Demo IT',
    advertisedModels: [],
    createdAt: now(),
    deletedAt: null,
    capabilities: [
      {
        id: id(),
        agentId: '',
        label: 'Searches the web',
        credentialMode: null,
        position: 'a',
        createdAt: now(),
        deletedAt: null,
      },
      {
        id: id(),
        agentId: '',
        label: 'Reads the Sales knowledge base',
        credentialMode: 'service_account',
        position: 'b',
        createdAt: now(),
        deletedAt: null,
      },
      {
        id: id(),
        agentId: '',
        label: 'Acts as you in the CRM',
        credentialMode: 'as_you',
        position: 'c',
        createdAt: now(),
        deletedAt: null,
      },
    ],
  }
  const financeAgent: TeamAgentWithCapabilities = {
    id: id(),
    name: 'Finance KB',
    icon: 'book',
    description: 'Answers questions from the finance knowledge base.',
    acpUrl: 'wss://agents.demo.thunderbolt/finance',
    category: 'sealed',
    status: 'published',
    managedBy: 'Demo IT',
    advertisedModels: [],
    createdAt: now(),
    deletedAt: null,
    capabilities: [
      {
        id: id(),
        agentId: '',
        label: 'Reads the Finance knowledge base',
        credentialMode: 'service_account',
        position: 'a',
        createdAt: now(),
        deletedAt: null,
      },
    ],
  }
  // Demo-only agent whose endpoint always fails to connect (spec §6), so the
  // connection-failure UX is reviewable end to end.
  const flakyAgent: TeamAgentWithCapabilities = {
    id: id(),
    name: 'Flaky Test Agent',
    icon: 'bug',
    description: 'A demo agent whose endpoint always fails to connect — used to review the connection-failure states.',
    acpUrl: FLAKY_ACP_URL,
    category: 'sealed',
    status: 'published',
    managedBy: 'Demo IT',
    advertisedModels: [],
    createdAt: now(),
    deletedAt: null,
    capabilities: [],
  }

  return {
    members: [admin, rae, jordan, ...extraMembers],
    groups: [salesGroup, financeGroup],
    groupMembers: [
      { groupId: salesGroup.id, memberId: rae.id },
      { groupId: salesGroup.id, memberId: extraMembers[0].id },
      { groupId: financeGroup.id, memberId: extraMembers[0].id },
      { groupId: salesGroup.id, memberId: extraMembers[1].id },
      { groupId: financeGroup.id, memberId: extraMembers[2].id },
      { groupId: financeGroup.id, memberId: extraMembers[8].id },
    ],
    agents: [salesAgent, financeAgent, flakyAgent],
    grants: [
      {
        id: id(),
        agentId: salesAgent.id,
        targetType: 'group',
        targetId: salesGroup.id,
        createdAt: now(),
        deletedAt: null,
      },
      {
        id: id(),
        agentId: financeAgent.id,
        targetType: 'group',
        targetId: financeGroup.id,
        createdAt: now(),
        deletedAt: null,
      },
      // Flaky agent granted to everyone so any member can reproduce the failure.
      { id: id(), agentId: flakyAgent.id, targetType: 'everyone', targetId: null, createdAt: now(), deletedAt: null },
    ],
    // Pre-seeded agent-side failures from three DIFFERENT members at staggered
    // times so the admin Health line reads "3 user failures since {earliest}"
    // without anyone clicking (spec §3/§6).
    connectionFailures: [
      { agentId: flakyAgent.id, memberId: rae.id, ts: minutesAgo(128), errorKind: 'unreachable' },
      { agentId: flakyAgent.id, memberId: jordan.id, ts: minutesAgo(74), errorKind: 'unreachable' },
      { agentId: flakyAgent.id, memberId: extraMembers[0].id, ts: minutesAgo(19), errorKind: 'unreachable' },
    ],
    policy: {
      personalAgentPolicy: 'all',
      userModelsAllowed: true,
      mcpPolicy: 'allowlist',
      mcpAllowlist: [],
      blockedExtensions: [],
      blockedIntegrations: [],
    },
    audit: [
      {
        id: id(),
        actor: 'admin@demo.thunderbolt',
        action: 'grant.create',
        target: 'Sales Agent → Sales',
        diff: {},
        ts: now(),
      },
    ],
  }
}

const live = <T extends { deletedAt: string | null }>(rows: T[]): T[] => rows.filter((r) => r.deletedAt === null)

/** Build the in-memory admin API over a FRESH store instance. The app holds one
 *  memoized instance (so mutations persist across renders); each call here is
 *  otherwise independent, which also keeps tests isolated. Shape-identical to
 *  `createAdminApi`. */
export const createDemoAdminApi = (): AdminApi => {
  const store = seedStore()
  const writeAudit = (action: string, target: string, diff: Record<string, unknown> = {}) => {
    store.audit.unshift({ id: id(), actor: 'admin@demo.thunderbolt', action, target, diff, ts: now() })
  }

  return {
    getMe: async (): Promise<AdminIdentity> => ({
      id: 'demo-admin',
      email: 'admin@demo.thunderbolt',
      status: 'active',
      isAdmin: true,
    }),

    listMembers: async () => live(store.members),
    inviteMember: async (input) => {
      const member: Member = {
        id: id(),
        // Name is unknown until the invitee signs in and completes their profile.
        name: '',
        email: input.email,
        status: 'invited',
        isAdmin: input.isAdmin ?? false,
        createdAt: now(),
        deletedAt: null,
      }
      store.members.push(member)
      writeAudit('member.invite', input.email)
      return member
    },
    removeMember: async (memberId) => {
      const member = store.members.find((m) => m.id === memberId)
      if (member) {
        member.deletedAt = now()
        writeAudit('member.remove', member.email)
      }
      return { success: true } as const
    },
    setMemberAdmin: async (memberId, isAdmin) => {
      const member = store.members.find((m) => m.id === memberId)
      if (!member) {
        throw new Error('demo: member not found')
      }
      member.isAdmin = isAdmin
      writeAudit(isAdmin ? 'member.promote' : 'member.demote', member.email)
      return { ...member }
    },
    listMemberGroups: async (memberId) => {
      const groupIds = new Set(store.groupMembers.filter((gm) => gm.memberId === memberId).map((gm) => gm.groupId))
      return live(store.groups).filter((group) => groupIds.has(group.id))
    },
    listMemberAgents: async (memberId) => {
      const member = store.members.find((m) => m.id === memberId)
      const memberGroupIds = new Set(
        store.groupMembers.filter((gm) => gm.memberId === memberId).map((gm) => gm.groupId),
      )
      const agentIds = new Set(
        live(store.grants)
          .filter(
            (grant) =>
              grant.targetType === 'everyone' ||
              (grant.targetType === 'admins' && !!member?.isAdmin) ||
              (grant.targetType === 'member' && grant.targetId === memberId) ||
              (grant.targetType === 'group' && grant.targetId !== null && memberGroupIds.has(grant.targetId)),
          )
          .map((grant) => grant.agentId),
      )
      return live(store.agents)
        .filter((agent) => agentIds.has(agent.id))
        .map((agent) => ({ id: agent.id, name: agent.name }))
    },

    listGroups: async () => live(store.groups),
    createGroup: async (name) => {
      const group: Group = { id: id(), name, createdAt: now(), deletedAt: null }
      store.groups.push(group)
      writeAudit('group.create', name)
      return group
    },
    deleteGroup: async (groupId) => {
      const group = store.groups.find((g) => g.id === groupId)
      if (group) {
        group.deletedAt = now()
        writeAudit('group.delete', group.name)
      }
      return { success: true } as const
    },
    listGroupMembers: async (groupId) => {
      const memberIds = new Set(store.groupMembers.filter((gm) => gm.groupId === groupId).map((gm) => gm.memberId))
      return live(store.members).filter((m) => memberIds.has(m.id))
    },
    addGroupMember: async (groupId, memberId) => {
      if (!store.groupMembers.some((gm) => gm.groupId === groupId && gm.memberId === memberId)) {
        store.groupMembers.push({ groupId, memberId })
        writeAudit('group.member.add', `${memberId} → ${groupId}`)
      }
      return { success: true } as const
    },
    removeGroupMember: async (groupId, memberId) => {
      store.groupMembers = store.groupMembers.filter((gm) => !(gm.groupId === groupId && gm.memberId === memberId))
      writeAudit('group.member.remove', `${memberId} ✕ ${groupId}`)
      return { success: true } as const
    },

    listAgents: async (): Promise<TeamAgentWithCapabilities[]> => live(store.agents),
    createAgent: async (input: AgentInput): Promise<TeamAgent> => {
      const agentId = id()
      const agent: TeamAgentWithCapabilities = {
        id: agentId,
        name: input.name,
        icon: input.icon ?? 'bot',
        description: input.description ?? '',
        acpUrl: input.acpUrl,
        category: input.category,
        status: input.status ?? 'draft',
        managedBy: input.managedBy ?? 'Demo IT',
        advertisedModels: input.advertisedModels ?? [],
        createdAt: now(),
        deletedAt: null,
        capabilities: (input.capabilities ?? []).map((c, i) => ({
          id: id(),
          agentId,
          label: c.label,
          credentialMode: c.credentialMode ?? null,
          position: String.fromCharCode(97 + i),
          createdAt: now(),
          deletedAt: null,
        })),
      }
      store.agents.push(agent)
      writeAudit('agent.create', input.name)
      return agent
    },
    updateAgent: async (agentId: string, patch: AgentPatch): Promise<TeamAgent> => {
      const agent = store.agents.find((a) => a.id === agentId)
      if (!agent) {
        throw new Error('demo: agent not found')
      }
      Object.assign(agent, {
        name: patch.name ?? agent.name,
        description: patch.description ?? agent.description,
        acpUrl: patch.acpUrl ?? agent.acpUrl,
        category: patch.category ?? agent.category,
        status: patch.status ?? agent.status,
      })
      writeAudit('agent.update', agent.name)
      return agent
    },
    deleteAgent: async (agentId) => {
      const agent = store.agents.find((a) => a.id === agentId)
      if (agent) {
        agent.deletedAt = now()
        writeAudit('agent.delete', agent.name)
      }
      return { success: true } as const
    },
    testConnection: async (acpUrl: string) => {
      if (acpUrl === FLAKY_ACP_URL) {
        return { reachable: false, error: 'connection refused' } as const
      }
      if (!acpUrl.startsWith('wss://')) {
        return { reachable: false, error: 'Demo: only wss:// URLs are reachable' } as const
      }
      // The agent's card advertises its own name; a live server would return it.
      // In the demo we derive a sensible one from the endpoint host.
      const label = new URL(acpUrl).hostname.split('.')[0] ?? ''
      const name = label ? label.charAt(0).toUpperCase() + label.slice(1) : ''
      return { reachable: true, name } as const
    },
    agentStatus: async (acpUrl: string): Promise<{ state: AgentConnectionState }> => {
      // A live server reports its handshake result; the demo assigns a plausible
      // per-endpoint state so the registry shows a spread. Freshly-registered
      // agents (unknown seed) read as never-verified.
      if (acpUrl === FLAKY_ACP_URL) {
        return { state: 'error' }
      }
      const seed = acpUrl.split('/').filter(Boolean).pop() ?? ''
      const bySeed: Record<string, AgentConnectionState> = { sales: 'ready', finance: 'not_connected' }
      return { state: bySeed[seed] ?? 'not_connected' }
    },
    /** Record an agent-side connection failure (spec §3.1). Reuses the audit
     *  pipe; the raw rows are deduped at read time in {@link listConnectionFailures}. */
    recordConnectionFailure: async (input: { agentId: string; memberId: string; errorKind: string }) => {
      store.connectionFailures.push({ ...input, ts: now() })
      writeAudit('agent.connect.fail', input.agentId, { errorKind: input.errorKind })
      return { success: true } as const
    },
    /** Deduped failure summary for one agent (spec §3.2): repeat failures from the
     *  same member within a 15-min window collapse to one counted incident. */
    listConnectionFailures: async (agentId: string): Promise<{ count: number; since: string | null }> => {
      const WINDOW_MS = 15 * 60_000
      const rows = store.connectionFailures
        .filter((f) => f.agentId === agentId)
        .sort((a, b) => a.ts.localeCompare(b.ts))
      const incidents: ConnectionFailure[] = []
      for (const row of rows) {
        const dup = incidents.some(
          (i) => i.memberId === row.memberId && Math.abs(Date.parse(i.ts) - Date.parse(row.ts)) < WINDOW_MS,
        )
        if (!dup) {
          incidents.push(row)
        }
      }
      return { count: incidents.length, since: incidents[0]?.ts ?? null }
    },
    describeEndpoint: async (acpUrl: string): Promise<AgentEndpointDetail> => {
      // A live server returns its own wiring; the demo derives a plausible,
      // per-endpoint descriptor from the URL so each agent reads differently.
      const seed = acpUrl.split('/').filter(Boolean).pop() ?? 'agent'
      const workspace = seed.charAt(0).toUpperCase() + seed.slice(1)
      // A credential names the external SYSTEM the agent connects to; the mode
      // says whose identity it runs under (each member's own vs a shared org
      // account) — so the label must never just restate the mode.
      const credentialsBySeed: Record<string, AgentEndpointDetail['credentials']> = {
        sales: [
          { label: 'Salesforce CRM', mode: 'as_you' },
          { label: 'Sales knowledge base', mode: 'service_account' },
        ],
        finance: [
          { label: 'NetSuite', mode: 'as_you' },
          { label: 'Finance knowledge base', mode: 'service_account' },
        ],
      }
      return {
        models: ['claude-opus-4-8', 'claude-haiku-4-5'],
        mcpServers: [`${seed}-mcp`, 'shared-knowledge-mcp'],
        tools: [`search_${seed}`, `summarize_${seed}`, 'create_note'],
        credentials: credentialsBySeed[seed] ?? [
          { label: 'Google Workspace', mode: 'as_you' },
          { label: `${workspace} knowledge base`, mode: 'service_account' },
        ],
      }
    },

    listGrants: async () => live(store.grants),
    createGrant: async (input: GrantInput): Promise<Grant> => {
      const grant: Grant = {
        id: id(),
        agentId: input.agentId,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        createdAt: now(),
        deletedAt: null,
      }
      store.grants.push(grant)
      writeAudit(
        input.targetType === 'member' ? 'grant.create.exception' : 'grant.create',
        `${input.agentId} → ${input.targetType}`,
      )
      return grant
    },
    revokeGrant: async (grantId) => {
      const grant = store.grants.find((g) => g.id === grantId)
      if (grant) {
        grant.deletedAt = now()
        writeAudit('grant.revoke', grant.agentId)
      }
      return { success: true } as const
    },

    getPolicy: async () => store.policy,
    putPolicy: async (policy: OrgPolicy) => {
      store.policy = policy
      writeAudit('policy.update', 'org policy')
      return policy
    },

    listAudit: async (params) => {
      const rows = params?.action ? store.audit.filter((e) => e.action === params.action) : store.audit
      return params?.limit ? rows.slice(0, params.limit) : rows
    },
  }
}
