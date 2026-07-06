/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useAgentEndpointDetail, useDeleteAgent } from '../api/hooks'
import type { TeamAgentWithCapabilities } from '../api/types'
import { AgentForm } from './agent-form'
import { AgentConnectionIndicator } from './connection-status'
import { StatusPill } from './status-pill'

/**
 * S1a — Agent detail, shown inline in the Registry's detail column (a
 * master-detail split, not an overlay). The admin's view of one team agent:
 * name, category, live status, and the technical wiring (models, MCP servers,
 * tools) fetched fresh from the ACP endpoint. Admin-only; never stored or synced
 * — the display-only card can't carry it (INVARIANT 2). Edit / Delete live in
 * the header; Delete clears the selection.
 */
export const AgentDetailPanel = ({ agent, onClose }: { agent: TeamAgentWithCapabilities; onClose: () => void }) => {
  const deleteAgent = useDeleteAgent()
  const [editOpen, setEditOpen] = useState(false)

  const handleDelete = async () => {
    await deleteAgent.mutateAsync(agent.id)
    onClose()
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold">{agent.name}</h2>
          <Button variant="ghost" size="icon-sm" aria-label="Close details" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill tone={agent.category === 'sealed' ? 'muted' : 'info'}>{agent.category}</StatusPill>
          <AgentConnectionIndicator acpUrl={agent.acpUrl} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {agent.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the agent and all grants to it. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                  Delete agent
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <AdminDetail agent={agent} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit agent</DialogTitle>
          </DialogHeader>
          {editOpen && <AgentForm agent={agent} onDone={() => setEditOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Live, admin-only endpoint wiring. */
const AdminDetail = ({ agent }: { agent: TeamAgentWithCapabilities }) => {
  const detailQuery = useAgentEndpointDetail(agent.acpUrl)
  const detail = detailQuery.data

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Admin view</h2>
        <p className="text-xs text-muted-foreground">
          Fetched live from the endpoint · admin-only · not stored or synced to members.
        </p>
      </div>

      <Field label="Endpoint">
        <code className="text-xs break-all">{agent.acpUrl}</code>
      </Field>

      {detailQuery.isPending && <p className="text-sm text-muted-foreground">Connecting to the endpoint…</p>}
      {detailQuery.isError && <p className="text-sm text-destructive">Could not reach the endpoint.</p>}
      {detail && (
        <>
          <Field label="Models">
            <TagList items={detail.models} />
          </Field>
          <Field label="MCP servers">
            <TagList items={detail.mcpServers} />
          </Field>
          <Field label="Tools">
            <TagList items={detail.tools} />
          </Field>
        </>
      )}
    </section>
  )
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    {children}
  </div>
)

const TagList = ({ items }: { items: string[] }) =>
  items.length === 0 ? (
    <span className="text-sm text-muted-foreground">None</span>
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md bg-muted px-2 py-0.5 text-xs">
          {item}
        </span>
      ))}
    </div>
  )
