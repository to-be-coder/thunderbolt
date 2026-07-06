/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AgentCard, AgentCardCapability } from '@shared/agent-cards'
import { type AgentKind, type AgentRef, getAgentRef } from '@/dal/chat-threads'
import { useTeamAgents as useTeamAgents_default } from '@/dal/use-team-agents'
import { builtInAgent } from '@/defaults/agents'
import type { Agent } from '@/types/acp'
import { useCurrentChatSession } from './chat-store'

/**
 * The normalized, agent-kind-aware descriptor the chat composer furniture reads.
 * The chat session still carries `selectedAgent` as an `Agent`, but team agents
 * have no `Agent` row and personal ACP v1 cards advertise nothing — so the
 * pickers, skills bar and blocked-state logic all read THIS single descriptor
 * ("the picker shows what the agent card advertises") rather than branching on
 * `Agent.type` per-surface.
 */
export type AgentDescriptor = {
  kind: AgentKind
  id: string
  name: string
  icon: string | null
  /** `sealed` / `extensible` for team agents; `null` for thunderbolt + personal. */
  category: 'sealed' | 'extensible' | null
  /** Model NAMES advertised by the agent (display copy). Empty for thunderbolt
   *  (models come from the user's connected set) and personal ACP v1 cards. */
  advertisedModels: string[]
  capabilities: AgentCardCapability[]
  /** The source team card, when this descriptor came from `team_agents_cache`. */
  card: AgentCard | null
  /** True when the thread references a team agent that is no longer in the
   *  cache — the grant was revoked (Stage 5 thread state T5a). */
  revoked: boolean
}

/** Synthesize a minimal `Agent` for the chat session when a team card is
 *  selected, so `session.selectedAgent` stays a valid `Agent`. The team binding
 *  itself lives on the thread's agentRef (`agentKind: 'team'`); this row only
 *  keeps unrelated `Agent`-typed consumers from crashing. */
export const agentCardToAgent = (card: AgentCard): Agent => ({
  id: card.id,
  name: card.name,
  type: 'managed-acp',
  transport: 'websocket',
  url: null,
  description: card.description,
  icon: card.icon,
  isSystem: 1,
  enabled: 1,
  deletedAt: null,
  userId: null,
})

const descriptorFromCard = (card: AgentCard): AgentDescriptor => ({
  kind: 'team',
  id: card.id,
  name: card.name,
  icon: card.icon,
  category: card.category,
  advertisedModels: card.advertisedModels,
  capabilities: card.capabilities,
  card,
  revoked: false,
})

const thunderboltDescriptor = (): AgentDescriptor => ({
  kind: 'thunderbolt',
  id: builtInAgent.id,
  name: builtInAgent.name,
  icon: builtInAgent.icon,
  category: null,
  advertisedModels: [],
  capabilities: [],
  card: null,
  revoked: false,
})

const personalDescriptor = (agent: Agent): AgentDescriptor => ({
  kind: 'personal',
  id: agent.id,
  name: agent.name,
  icon: agent.icon,
  category: null,
  // v1 personal ACP cards advertise nothing — the model slot renders the
  // "set by your organization" static chip.
  advertisedModels: [],
  capabilities: [],
  card: null,
  revoked: false,
})

const revokedTeamDescriptor = (agentId: string): AgentDescriptor => ({
  kind: 'team',
  id: agentId,
  name: 'Removed agent',
  icon: null,
  category: null,
  advertisedModels: [],
  capabilities: [],
  card: null,
  revoked: true,
})

/**
 * Resolve the composer's active agent into an {@link AgentDescriptor}.
 *
 * The team binding lives ONLY on the thread's agentRef (team agents have no
 * `Agent`), so a `team` ref drives a cache lookup — hitting a revoked descriptor
 * when the card is gone. Every other ref trusts `selectedAgent`: built-in →
 * thunderbolt, anything else → personal.
 */
export const resolveAgentDescriptor = (params: {
  agentRef: AgentRef
  selectedAgent: Agent
  teamCards: AgentCard[]
}): AgentDescriptor => {
  const { agentRef, selectedAgent, teamCards } = params

  if (agentRef.kind === 'team') {
    const card = teamCards.find((c) => c.id === agentRef.agentId)
    return card ? descriptorFromCard(card) : revokedTeamDescriptor(agentRef.agentId)
  }

  if (selectedAgent.type === 'built-in') {
    return thunderboltDescriptor()
  }
  return personalDescriptor(selectedAgent)
}

/** True when the skills bar should render for this agent: the Thunderbolt agent
 *  and EXTENSIBLE company agents only. Sealed company + personal ACP agents get
 *  no bar at all (T3 — absent, not disabled). */
export const showsSkillsBar = (descriptor: AgentDescriptor): boolean =>
  descriptor.kind === 'thunderbolt' || (descriptor.kind === 'team' && descriptor.category === 'extensible')

/** True when a first `/` should raise the educational note + seal-hit telemetry:
 *  SEALED company agents and personal ACP agents (the surfaces with no skills). */
export const isSealedForSlash = (descriptor: AgentDescriptor): boolean =>
  descriptor.kind === 'personal' || (descriptor.kind === 'team' && descriptor.category === 'sealed')

/**
 * Live descriptor for the current chat session. Derives the thread's agentRef
 * during render (no effect) and resolves it against the team cache. `useTeamAgents`
 * is injectable so component tests can drive fixture cards.
 */
export const useAgentDescriptor = (useTeamAgents = useTeamAgents_default): AgentDescriptor => {
  const { chatThread, selectedAgent, selectedAgentKind } = useCurrentChatSession()
  const teamCards = useTeamAgents()
  // Prefer the persisted thread ref; fall back to the session's in-memory
  // selected kind so a draft / brand-new chat (no thread row yet) still resolves
  // a TEAM agent instead of collapsing to 'personal' (which advertises nothing,
  // so the composer would wrongly show "Set by your organization").
  const agentRef: AgentRef = chatThread
    ? getAgentRef(chatThread)
    : selectedAgentKind === 'thunderbolt'
      ? { kind: 'thunderbolt', agentId: null }
      : { kind: selectedAgentKind, agentId: selectedAgent.id }
  return resolveAgentDescriptor({ agentRef, selectedAgent, teamCards })
}
