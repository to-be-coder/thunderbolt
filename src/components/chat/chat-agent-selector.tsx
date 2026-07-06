/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useCurrentChatSession, useChatStore } from '@/chats/chat-store'
import { agentCardToAgent, useAgentDescriptor } from '@/chats/agent-descriptor'
import { SearchableMenu, type SearchableMenuGroup, type SearchableMenuItem } from '@/components/ui/searchable-menu'
import { useAgents as useAgents_default } from '@/dal/agents'
import { useTeamAgents as useTeamAgents_default } from '@/dal/use-team-agents'
import { useNewlyGrantedTeamAgents as useNewlyGrantedTeamAgents_default } from '@/hooks/use-newly-granted-agents'
import type { AgentRef } from '@/dal/chat-threads'
import { NewGrantBadge } from '@/components/settings/agents/new-grant-badge'
import { builtInAgent } from '@/defaults/agents'
import { useHaptics } from '@/hooks/use-haptics'
import { cn } from '@/lib/utils'
import type { AgentCard } from '@shared/agent-cards'
import type { Agent } from '@/types/acp'
import { Building2, ChevronDown, Globe, Zap, type LucideIcon } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { useNavigate as useNavigate_default } from 'react-router'

/** Item payload: an org card OR one of the user's own agents. */
type AgentSelectItemData = { kind: 'card'; card: AgentCard } | { kind: 'agent'; agent: Agent }

type ChatAgentSelectorProps = {
  /** Once the thread has any message the agentRef is immutable (Stage 1), so the
   *  control renders read-only: tapping it opens the agent detail view (Stage 5)
   *  rather than the picker. */
  readOnly: boolean
  useTeamAgents?: typeof useTeamAgents_default
  useAgents?: typeof useAgents_default
  useNewlyGrantedTeamAgents?: typeof useNewlyGrantedTeamAgents_default
  useNavigate?: typeof useNavigate_default
}

const IconForYours = (agent: Agent): ComponentType<{ className?: string }> => (agent.type === 'built-in' ? Zap : Globe)

const cardItem = (card: AgentCard, isNewlyGranted: boolean): SearchableMenuItem<AgentSelectItemData> => ({
  id: card.id,
  label: card.name,
  description: card.description,
  icon: <Building2 className="size-3.5 text-muted-foreground" />,
  ...(isNewlyGranted ? { badge: <NewGrantBadge /> } : {}),
  data: { kind: 'card', card },
})

const agentItem = (agent: Agent): SearchableMenuItem<AgentSelectItemData> => {
  const Icon = IconForYours(agent)
  return {
    id: agent.id,
    label: agent.name,
    description: agent.description ?? undefined,
    icon: <Icon className="size-3.5 text-muted-foreground" />,
    data: { kind: 'agent', agent },
  }
}

/**
 * Build the two member-chat sections: "From your organization" (team cards from
 * `team_agents_cache`) and "Yours" (the Thunderbolt agent pinned first, then the
 * user's personal ACP agents). Empty sections are dropped so the menu stays tight.
 */
export const buildAgentSelectorGroups = (
  teamCards: AgentCard[],
  personalAgents: Agent[],
  newlyGranted: Set<string> = new Set(),
): SearchableMenuGroup<AgentSelectItemData>[] => {
  const groups: SearchableMenuGroup<AgentSelectItemData>[] = []

  if (teamCards.length > 0) {
    groups.push({
      id: 'org',
      label: 'From your organization',
      items: teamCards.map((card) => cardItem(card, newlyGranted.has(card.id))),
    })
  }

  groups.push({
    id: 'yours',
    label: 'Yours',
    items: [agentItem(builtInAgent), ...personalAgents.map(agentItem)],
  })

  return groups
}

/** Resolve a chosen menu item into the agentRef + the `Agent` the session should
 *  carry. Team cards synthesize a card-agent; the authoritative binding is the
 *  team agentRef written to the thread. */
export const resolveSelection = (data: AgentSelectItemData): { ref: AgentRef; agent: Agent } => {
  if (data.kind === 'card') {
    return { ref: { kind: 'team', agentId: data.card.id }, agent: agentCardToAgent(data.card) }
  }
  const agent = data.agent
  if (agent.type === 'built-in') {
    return { ref: { kind: 'thunderbolt', agentId: null }, agent }
  }
  return { ref: { kind: 'personal', agentId: agent.id }, agent }
}

const TriggerIcon = ({ icon: Icon }: { icon: LucideIcon }) => (
  <Icon className="size-3.5 text-muted-foreground shrink-0" />
)

/**
 * Agent selector for the chat composer's top-left slot. Two sections (org + yours),
 * ACTIVE only on empty threads; on a thread that already has messages it renders
 * the SAME control read-only and a tap navigates to the agent detail view instead
 * of opening the picker (Stage 5 placeholder → `/settings/agents`).
 */
export const ChatAgentSelector = ({
  readOnly,
  useTeamAgents = useTeamAgents_default,
  useAgents = useAgents_default,
  useNewlyGrantedTeamAgents = useNewlyGrantedTeamAgents_default,
  useNavigate = useNavigate_default,
}: ChatAgentSelectorProps) => {
  const { id: chatThreadId } = useCurrentChatSession()
  const setSelectedAgentRef = useChatStore((state) => state.setSelectedAgentRef)
  const descriptor = useAgentDescriptor(useTeamAgents)
  const teamCards = useTeamAgents()
  const personalAgents = useAgents()
  const newlyGranted = useNewlyGrantedTeamAgents(useTeamAgents)
  const navigate = useNavigate()
  const { triggerSelection } = useHaptics()
  const [open, setOpen] = useState(false)

  const groups = buildAgentSelectorGroups(teamCards, personalAgents, newlyGranted)

  const triggerIcon: LucideIcon =
    descriptor.kind === 'team' ? Building2 : descriptor.kind === 'thunderbolt' ? Zap : Globe

  const handleChange = (_id: string, item: SearchableMenuItem<AgentSelectItemData>) => {
    if (!item.data) {
      return
    }
    triggerSelection()
    const { ref, agent } = resolveSelection(item.data)
    setSelectedAgentRef(chatThreadId, ref, agent).catch(console.error)
  }

  const triggerInner = (isOpen: boolean) => (
    <div
      data-testid="chat-agent-selector-trigger"
      aria-disabled={readOnly}
      className={cn(
        'flex items-center gap-2 px-3 h-[var(--touch-height-sm)] rounded-full transition-colors text-[length:var(--font-size-body)] max-w-[50vw] md:max-w-none cursor-pointer',
        !readOnly && isOpen ? 'bg-secondary' : 'hover:bg-secondary/50',
      )}
    >
      <TriggerIcon icon={triggerIcon} />
      <span className="font-medium truncate">{descriptor.name}</span>
      {!readOnly && (
        <ChevronDown
          className={cn('size-3.5 text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-180')}
        />
      )}
    </div>
  )

  // Read-only (thread has messages): the control is present but tapping it opens
  // the agent detail view (Stage 5), never the picker. Stage 2 placeholder nav.
  if (readOnly) {
    return (
      <button
        type="button"
        data-testid="chat-agent-selector-readonly"
        className="flex items-center focus:outline-none"
        onClick={() => navigate(`/settings/agents/${descriptor.id}`)}
      >
        {triggerInner(false)}
      </button>
    )
  }

  return (
    <SearchableMenu
      items={groups}
      value={descriptor.id}
      onValueChange={handleChange}
      searchable={teamCards.length + personalAgents.length > 10}
      searchPlaceholder="Search agents"
      emptyMessage="No agents found"
      blurBackdrop
      trigger={(_selected, isOpen) => triggerInner(isOpen)}
      width={320}
      maxHeight={340}
      open={open}
      onOpenChange={setOpen}
    />
  )
}
