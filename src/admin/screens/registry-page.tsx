/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SlideInPanel } from '@/components/slide-in-panel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { agentIconFor } from '@/components/settings/agents/detail/agent-icons'
import { AlertTriangle, ChevronRight, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useAgents, useConnectionFailures, useGrants } from '../api/hooks'
import type { Grant, TeamAgentWithCapabilities } from '../api/types'
import { AgentDetailPanel } from './agent-detail-panel'
import { AgentForm } from './agent-form'

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
        'flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors',
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

/**
 * S1 — Registry. The agent list fills the page until one is selected; then the
 * detail slides in from the right (an inline flex child — no overlay) and the
 * list shrinks to make room. Each card shows the agent's live ACP connection
 * status; Edit / Delete live in the detail. The `+` opens the register modal.
 */
export const RegistryPage = () => {
  const agentsQuery = useAgents()
  const [registering, setRegistering] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const agents = agentsQuery.data ?? []
  const selectedAgent = agents.find((agent) => agent.id === selectedId) ?? null

  // Latch the last selected agent so it stays rendered through the close
  // animation (ref assignment in render is the sanctioned no-effect pattern).
  const lastAgent = useRef<TeamAgentWithCapabilities | null>(selectedAgent)
  if (selectedAgent) {
    lastAgent.current = selectedAgent
  }
  const panelAgent = selectedAgent ?? lastAgent.current
  const open = selectedAgent !== null

  return (
    // `-mr-6` + widened width cancel the admin content's right p-6 so the detail
    // panel (and its full-bleed save banner) reach the true right edge; the list
    // keeps its inset.
    <div className="-my-6 -mr-6 flex h-[calc(100%_+_3rem)] w-[calc(100%_+_1.5rem)] min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto pr-6">
        <div className="mx-auto flex w-full max-w-[728px] flex-col gap-6 py-6">
          <PageHeader title="Agents">
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg bg-card hover:bg-accent"
              onClick={() => setRegistering(true)}
              aria-label="Register an agent"
            >
              <Plus />
            </Button>
          </PageHeader>

          <Dialog open={registering} onOpenChange={setRegistering}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>Register agent</DialogTitle>
              </DialogHeader>
              {registering && <AgentForm agent={null} onDone={() => setRegistering(false)} />}
            </DialogContent>
          </Dialog>

          <div className="flex flex-col gap-2">
            {agentsQuery.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!agentsQuery.isPending && agents.length === 0 && (
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
          {panelAgent && (
            <AgentDetailPanel key={panelAgent.id} agent={panelAgent} onClose={() => setSelectedId(null)} />
          )}
        </div>
      </SlideInPanel>
    </div>
  )
}
