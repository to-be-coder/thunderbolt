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
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useState } from 'react'
import { useAgents, useDeleteAgent } from '../api/hooks'
import type { TeamAgentWithCapabilities } from '../api/types'
import { AgentForm } from './agent-form'
import { StatusPill } from './status-pill'

type Editing = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; agent: TeamAgentWithCapabilities }

/** S1 — Registry. List of team agents plus the register/edit form. */
export const RegistryPage = () => {
  const agentsQuery = useAgents()
  const deleteAgent = useDeleteAgent()
  const [editing, setEditing] = useState<Editing>({ mode: 'closed' })

  const agents = agentsQuery.data ?? []

  if (editing.mode !== 'closed') {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader title={editing.mode === 'new' ? 'Register agent' : 'Edit agent'} />
        <AgentForm
          agent={editing.mode === 'edit' ? editing.agent : null}
          onDone={() => setEditing({ mode: 'closed' })}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader title="Registry">
        <Button
          variant="outline"
          size="icon"
          className="rounded-lg"
          onClick={() => setEditing({ mode: 'new' })}
          aria-label="Register agent"
        >
          <Plus />
        </Button>
      </PageHeader>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentsQuery.isPending && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!agentsQuery.isPending && agents.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No agents registered yet.
                </TableCell>
              </TableRow>
            )}
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">
                  <span className="mr-2" aria-hidden>
                    {agent.icon || '🤖'}
                  </span>
                  {agent.name}
                </TableCell>
                <TableCell>
                  <StatusPill tone={agent.category === 'sealed' ? 'muted' : 'info'}>{agent.category}</StatusPill>
                </TableCell>
                <TableCell className="text-muted-foreground">{agent.capabilities.length}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ mode: 'edit', agent })}>
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
                        <AlertDialogAction
                          onClick={() => deleteAgent.mutate(agent.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Delete agent
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
