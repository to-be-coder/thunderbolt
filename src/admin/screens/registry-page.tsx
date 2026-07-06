/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { Building2, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useAgents } from '../api/hooks'
import { AgentDetailPanel } from './agent-detail-panel'
import { AgentForm } from './agent-form'
import { AgentConnectionIndicator } from './connection-status'

/**
 * S1 — Registry. A master-detail split: the middle column lists team agents as
 * cards (each showing its live ACP connection status); selecting one shows its
 * detail inline in the right column (Edit / Delete live there). The `+` opens
 * the register form in a modal.
 */
export const RegistryPage = () => {
  const agentsQuery = useAgents()
  const [registering, setRegistering] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const agents = agentsQuery.data ?? []
  const selectedAgent = agents.find((agent) => agent.id === selectedId) ?? null

  return (
    <div className="flex w-full flex-col gap-6">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
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

        <div>
          {selectedAgent ? (
            <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border p-8">
              <p className="text-sm text-muted-foreground">Select an agent to see its details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
