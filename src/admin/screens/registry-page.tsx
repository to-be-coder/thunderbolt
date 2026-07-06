/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { Building2, ChevronRight, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useAgents } from '../api/hooks'
import type { TeamAgentWithCapabilities } from '../api/types'
import { AgentDetailPanel } from './agent-detail-panel'
import { AgentForm } from './agent-form'
import { AgentConnectionIndicator } from './connection-status'

/** Detail column width when open. The width animation reflows the list column;
 *  the content translate slides it in — together they read as one motion. */
const DETAIL_WIDTH = 'clamp(360px, 42vw, 560px)'
// Linear's spring curve — fast start, smooth tail, no overshoot.
const SLIDE = 'cubic-bezier(0.32, 0.72, 0, 1)'

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
    <div className="flex w-full">
      <div className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <PageHeader title="Registry">
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg"
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
              <button
                key={agent.id}
                type="button"
                onClick={() => setSelectedId(agent.id)}
                data-testid={`agent-card-${agent.id}`}
                aria-label={`Open ${agent.name}`}
                aria-pressed={agent.id === selectedId}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                  agent.id === selectedId ? 'border-primary bg-secondary/50' : 'border-border hover:bg-secondary/50',
                )}
              >
                <Building2 className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{agent.name}</div>
                  <AgentConnectionIndicator acpUrl={agent.acpUrl} />
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside
        className="shrink-0 overflow-hidden transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: open ? DETAIL_WIDTH : '0px', transitionTimingFunction: SLIDE }}
        aria-hidden={!open}
      >
        <div
          className="transition-transform duration-300 motion-reduce:transition-none"
          style={{
            width: DETAIL_WIDTH,
            transform: open ? 'translateX(0)' : 'translateX(100%)',
            transitionTimingFunction: SLIDE,
          }}
        >
          <div className="pl-6">
            {panelAgent && <AgentDetailPanel agent={panelAgent} onClose={() => setSelectedId(null)} />}
          </div>
        </div>
      </aside>
    </div>
  )
}
