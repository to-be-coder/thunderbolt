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
import { AgentGlyph } from '@/components/settings/agents/detail/agent-icon-picker'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { builtInAgent } from '@/defaults/agents'
import { useHaptics } from '@/hooks/use-haptics'
import { usePersonalAgentIcons } from '@/hooks/use-personal-agent-icons'
import { useThunderboltAgentIcon } from '@/hooks/use-thunderbolt-agent-icon'
import { useOrgPolicy as useOrgPolicy_default } from '@/dal/use-org-policy'
import { cn } from '@/lib/utils'
import type { AgentCard } from '@shared/agent-cards'
import type { Agent } from '@/types/acp'
import { Building2, ChevronDown, Globe, Plus, Zap, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

/** Item payload: an org card OR one of the user's own agents. */
type AgentSelectItemData = { kind: 'card'; card: AgentCard } | { kind: 'agent'; agent: Agent }

type ChatAgentSelectorProps = {
  /** Once the thread has any message the agentRef is immutable (Stage 1), so the
   *  control renders read-only and inert — it can't be tapped; a tooltip explains
   *  the agent is fixed for the conversation. */
  readOnly: boolean
  useTeamAgents?: typeof useTeamAgents_default
  useAgents?: typeof useAgents_default
  useNewlyGrantedTeamAgents?: typeof useNewlyGrantedTeamAgents_default
  useOrgPolicy?: typeof useOrgPolicy_default
}

/** A menu-item icon slot that renders any stored icon value (Lucide KEY or an
 *  uploaded/remote image) at a fixed 14px, so custom glyphs sit like the rest. */
const ItemGlyph = ({ value }: { value: string }) => (
  <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-md">
    <AgentGlyph value={value} className="size-3.5 text-muted-foreground" />
  </span>
)

const cardItem = (card: AgentCard, isNewlyGranted: boolean): SearchableMenuItem<AgentSelectItemData> => ({
  id: card.id,
  label: card.name,
  icon: <ItemGlyph value={card.icon} />,
  ...(isNewlyGranted ? { badge: <NewGrantBadge /> } : {}),
  data: { kind: 'card', card },
})

const agentItem = (agent: Agent, iconValue: string): SearchableMenuItem<AgentSelectItemData> => ({
  id: agent.id,
  label: agent.name,
  icon: <ItemGlyph value={iconValue} />,
  data: { kind: 'agent', agent },
})

/** Item renderer for the agent menu — mirrors the default row but pins the label
 *  to 14px (`--font-size-body`) across the Company agents / Your agents groups. */
const renderAgentItem = (item: SearchableMenuItem<AgentSelectItemData>, isSelected: boolean) => (
  <div
    className={cn(
      'w-full flex items-center gap-2 px-3 h-[var(--touch-height-sm)] rounded-lg transition-colors text-left cursor-pointer text-[length:var(--font-size-body)]',
      isSelected ? 'bg-accent' : 'hover:bg-accent/50',
    )}
  >
    {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
    {item.badge && <span className="flex-shrink-0">{item.badge}</span>}
  </div>
)

/**
 * Build the two member-chat sections: "From your organization" (team cards from
 * `team_agents_cache`) and "Yours" (the Thunderbolt agent pinned first, then the
 * user's personal ACP agents). Empty sections are dropped so the menu stays tight.
 */
export const buildAgentSelectorGroups = (
  teamCards: AgentCard[],
  personalAgents: Agent[],
  newlyGranted: Set<string> = new Set(),
  /** Member icon overrides (agentId → icon value) for personal agents. */
  personalIcons: Record<string, string> = {},
  /** The member's chosen glyph for the built-in Thunderbolt agent. */
  thunderboltIcon: string = builtInAgent.icon ?? 'zap',
): SearchableMenuGroup<AgentSelectItemData>[] => {
  const groups: SearchableMenuGroup<AgentSelectItemData>[] = []

  // No section headers inside the dropdown — the groups exist only to keep the
  // company agents and the member's own agents visually separated (the gap
  // between groups), not to label them.
  if (teamCards.length > 0) {
    groups.push({
      id: 'org',
      items: teamCards.map((card) => cardItem(card, newlyGranted.has(card.id))),
    })
  }

  groups.push({
    id: 'yours',
    items: [
      agentItem(builtInAgent, thunderboltIcon),
      ...personalAgents.map((agent) => agentItem(agent, personalIcons[agent.id] ?? 'globe')),
    ],
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
  useOrgPolicy = useOrgPolicy_default,
}: ChatAgentSelectorProps) => {
  const { id: chatThreadId } = useCurrentChatSession()
  const setSelectedAgentRef = useChatStore((state) => state.setSelectedAgentRef)
  const descriptor = useAgentDescriptor(useTeamAgents)
  const teamCards = useTeamAgents()
  const personalAgents = useAgents()
  const newlyGranted = useNewlyGrantedTeamAgents(useTeamAgents)
  const { icons: personalIcons } = usePersonalAgentIcons()
  const thunderboltIcon = useThunderboltAgentIcon()
  const { triggerSelection } = useHaptics()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // Members can add their own ACP agents only when org policy allows it; when the
  // admin disables personal agents, the "Add agent" entry disappears entirely.
  const policy = useOrgPolicy()
  const canAddAgent = policy.personalAgentPolicy === 'all' || policy.personalAgentPolicy === 'no_native'

  const groups = buildAgentSelectorGroups(teamCards, personalAgents, newlyGranted, personalIcons, thunderboltIcon)

  const triggerIcon: LucideIcon =
    descriptor.kind === 'team' ? Building2 : descriptor.kind === 'thunderbolt' ? Zap : Globe
  // The selected agent's glyph honors the member's icon override, matching the menu.
  // Team agents have no member override — their admin-set icon rides on the descriptor.
  const triggerIconValue: string | null =
    descriptor.kind === 'thunderbolt'
      ? thunderboltIcon
      : descriptor.kind === 'personal'
        ? (personalIcons[descriptor.id] ?? 'globe')
        : descriptor.icon

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
        'flex items-center gap-2 px-3 h-[var(--touch-height-sm)] rounded-lg transition-colors text-[length:var(--font-size-body)] max-w-[50vw] md:max-w-none',
        readOnly ? 'cursor-default' : cn('cursor-pointer', isOpen ? 'bg-secondary' : 'hover:bg-secondary/50'),
      )}
    >
      {triggerIconValue ? <ItemGlyph value={triggerIconValue} /> : <TriggerIcon icon={triggerIcon} />}
      <span className="font-medium truncate">{descriptor.name}</span>
      {!readOnly && (
        <ChevronDown
          className={cn('size-3.5 text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-180')}
        />
      )}
    </div>
  )

  // Read-only (thread has messages): the agentRef is locked for the conversation,
  // so the control is inert — not clickable, with a tooltip explaining why.
  if (readOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div data-testid="chat-agent-selector-readonly" className="flex items-center">
            {triggerInner(false)}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">
          The agent is set when a chat begins and can’t be changed mid-conversation. Start a new chat to use a different
          agent.
        </TooltipContent>
      </Tooltip>
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
      renderItem={renderAgentItem}
      itemGap="gap-0.5"
      width={320}
      maxHeight={340}
      open={open}
      onOpenChange={setOpen}
      footer={
        canAddAgent ? (
          <button
            type="button"
            data-testid="add-agent"
            onClick={() => {
              setOpen(false)
              navigate('/settings/agents')
            }}
            // Negative margins cancel the shared footer's px-2 py-2 so the row is a
            // flush, 36px-tall, full-width item (hover fills edge to edge).
            className="-m-2 flex h-[var(--touch-height-default)] w-[calc(100%_+_1rem)] cursor-pointer items-center justify-start gap-2 px-4 text-[length:var(--font-size-body)] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="size-4" />
            Add agent
          </button>
        ) : undefined
      }
    />
  )
}
