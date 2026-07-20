/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SlideInPanel } from '@/components/slide-in-panel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdminPageHeader } from '../admin-chrome'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { agentIconFor, THUNDERBOLT_ICON_KEY } from '@/components/settings/agents/detail/agent-icons'
import { AgentGlyph } from '@/components/settings/agents/detail/agent-icon-picker'
import { builtInAgent } from '@/defaults/agents'
import { AlertTriangle, ChevronRight, Plus, Settings } from 'lucide-react'
import { useRef, useState } from 'react'
import { useAgents, useConnectionFailures, useGrants } from '../api/hooks'
import type { Grant, TeamAgentWithCapabilities } from '../api/types'
import { AgentDetailPanel } from './agent-detail-panel'
import { AgentForm } from './agent-form'
import { ThunderboltAgentDetailPanel } from './thunderbolt-agent-detail-panel'
import { useAgentPolicy } from './use-agent-policy'

/** Sentinel selection id for the built-in Thunderbolt row (it has no agent
 *  record — it's the app's own assistant, surfaced via policy). */
const THUNDERBOLT_ROW_ID = '__thunderbolt__'

/** The agent's access mode, derived from its grants (mirrors the Access tab). */
const accessModeLabel = (grants: Grant[]): string => {
  if (grants.some((g) => g.targetType === 'everyone')) {
    return 'Everyone'
  }
  if (grants.some((g) => g.targetType === 'admins')) {
    return 'Admin only'
  }
  return 'Restricted'
}

/** The gear beside the `+`: the agent-facing policy toggles (moved off the old
 *  Policy page). Two INDEPENDENT switches — personal ACP agents and the built-in
 *  Thunderbolt agent — each persisting immediately. */
const AgentPolicyPopover = () => {
  const { personalAllowed, nativeAllowed, setPersonalAllowed, setNativeAllowed } = useAgentPolicy()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-md bg-card hover:bg-accent md:size-[var(--touch-height-default)] md:rounded-lg"
          aria-label="Agent settings"
        >
          <Settings />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1">
        <PolicyToggleRow
          title="Allow personal agents"
          description="Let members connect their own ACP agents."
          checked={personalAllowed}
          onCheckedChange={setPersonalAllowed}
          label="Allow personal agents"
        />
        <PolicyToggleRow
          title="Built-in Thunderbolt agent"
          description="Give members the built-in assistant."
          checked={nativeAllowed}
          onCheckedChange={setNativeAllowed}
          label="Allow the built-in Thunderbolt agent"
        />
      </PopoverContent>
    </Popover>
  )
}

const PolicyToggleRow = ({
  title,
  description,
  checked,
  onCheckedChange,
  label,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
  label: string
}) => (
  <div className="flex items-start justify-between gap-3 rounded-md px-3 py-2.5">
    <div className="min-w-0">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-[length:var(--font-size-sm)] text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} className="mt-0.5 shrink-0" />
  </div>
)

/** A registry list row (spec §3): governance-dense — access mode · category, and
 *  a passive failure count only when the agent has recent connection failures. */
const RegistryCard = ({
  agent,
  selected,
  onSelect,
}: {
  agent: TeamAgentWithCapabilities
  selected: boolean
  onSelect: () => void
}) => {
  const grantsQuery = useGrants()
  const failures = useConnectionFailures(agent.id)
  const agentGrants = (grantsQuery.data ?? []).filter((grant) => grant.agentId === agent.id)
  const count = failures.data?.count ?? 0
  const Icon = agentIconFor(agent.icon)

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`agent-card-${agent.id}`}
      aria-label={`Open ${agent.name}`}
      aria-pressed={selected}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors',
        selected ? 'bg-accent' : 'hover:bg-secondary/50',
      )}
    >
      {/* When the agent has recent connection failures, the icon slot itself
          becomes the warning — a passive signal, no count. */}
      <div
        className={cn(
          'flex aspect-square size-9 shrink-0 items-center justify-center rounded-md',
          count > 0 ? 'bg-destructive/10' : 'bg-muted',
        )}
        title={count > 0 ? `${count} recent connection failure${count === 1 ? '' : 's'}` : undefined}
        data-testid={count > 0 ? `agent-failures-${agent.id}` : undefined}
      >
        {count > 0 ? (
          <AlertTriangle className="size-5 text-destructive" aria-label="Recent connection failures" />
        ) : (
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-medium">{agent.name}</div>
        {/* Governance signals, static — the roster opens no connection (spec §0/§1/§3). */}
        <p className="text-sm text-muted-foreground">
          {accessModeLabel(agentGrants)} · <span className="capitalize">{agent.category}</span>
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}

/** The built-in Thunderbolt agent row — shown only when the built-in agent is
 *  enabled in the settings popover. It has no endpoint or grants; it's given to
 *  Everyone by policy. */
const ThunderboltRow = ({ selected, onSelect }: { selected: boolean; onSelect: () => void }) => (
  <button
    type="button"
    onClick={onSelect}
    data-testid="agent-card-thunderbolt"
    aria-label="Open Thunderbolt agent"
    aria-pressed={selected}
    className={cn(
      'flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors',
      selected ? 'bg-accent' : 'hover:bg-secondary/50',
    )}
  >
    <div className="flex aspect-square size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
      <AgentGlyph value={THUNDERBOLT_ICON_KEY} className="size-5" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="truncate text-base font-medium">{builtInAgent.name}</div>
      <p className="text-sm text-muted-foreground">Built-in · Everyone</p>
    </div>
    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
  </button>
)

/**
 * S1 — Registry. The agent list fills the page until one is selected; then the
 * detail slides in from the right (an inline flex child — no overlay) and the
 * list shrinks to make room. The built-in Thunderbolt agent appears at the top
 * when enabled; the company agents follow. The gear opens the agent-policy
 * toggles; the `+` opens the register modal.
 */
export const RegistryPage = () => {
  const agentsQuery = useAgents()
  const { nativeAllowed } = useAgentPolicy()
  const [registering, setRegistering] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const agents = agentsQuery.data ?? []
  const selectedAgent = agents.find((agent) => agent.id === selectedId) ?? null
  const thunderboltSelected = selectedId === THUNDERBOLT_ROW_ID
  const open = selectedAgent !== null || thunderboltSelected

  // Latch the last panel so it stays rendered through the close animation (ref
  // assignment in render is the sanctioned no-effect pattern).
  const lastPanel = useRef<{ kind: 'agent'; agent: TeamAgentWithCapabilities } | { kind: 'thunderbolt' } | null>(null)
  if (selectedAgent) {
    lastPanel.current = { kind: 'agent', agent: selectedAgent }
  } else if (thunderboltSelected) {
    lastPanel.current = { kind: 'thunderbolt' }
  }
  const panel = lastPanel.current

  return (
    // `-mr-6` + widened width cancel the admin content's right p-6 so the detail
    // panel (and its full-bleed save banner) reach the true right edge; the list
    // keeps its inset.
    <div className="relative -my-6 -mr-6 flex h-[calc(100%_+_3rem)] w-[calc(100%_+_1.5rem)] min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto pr-6">
        <div className="mx-auto flex w-full max-w-[728px] flex-col gap-6 pt-0 pb-6 md:pt-6">
          <AdminPageHeader title="Agents">
            <div className="flex items-center gap-2">
              <AgentPolicyPopover />
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-md bg-card hover:bg-accent md:size-[var(--touch-height-default)] md:rounded-lg"
                onClick={() => setRegistering(true)}
                aria-label="Register an agent"
              >
                <Plus />
              </Button>
            </div>
          </AdminPageHeader>

          <Dialog open={registering} onOpenChange={setRegistering}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>Register agent</DialogTitle>
              </DialogHeader>
              {registering && <AgentForm agent={null} onDone={() => setRegistering(false)} />}
            </DialogContent>
          </Dialog>

          <div className="flex flex-col gap-2">
            {nativeAllowed && (
              <ThunderboltRow selected={thunderboltSelected} onSelect={() => setSelectedId(THUNDERBOLT_ROW_ID)} />
            )}
            {agentsQuery.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!agentsQuery.isPending && agents.length === 0 && !nativeAllowed && (
              <p className="text-sm text-muted-foreground">No agents registered yet.</p>
            )}
            {agents.map((agent) => (
              <RegistryCard
                key={agent.id}
                agent={agent}
                selected={agent.id === selectedId}
                onSelect={() => setSelectedId(agent.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <SlideInPanel open={open}>
        <div className="h-full border-l border-border/30">
          {panel?.kind === 'thunderbolt' && <ThunderboltAgentDetailPanel onClose={() => setSelectedId(null)} />}
          {panel?.kind === 'agent' && (
            <AgentDetailPanel key={panel.agent.id} agent={panel.agent} onClose={() => setSelectedId(null)} />
          )}
        </div>
      </SlideInPanel>
    </div>
  )
}
