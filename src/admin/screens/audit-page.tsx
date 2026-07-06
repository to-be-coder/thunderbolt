/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useState } from 'react'
import { useAudit } from '../api/hooks'
import type { AuditEvent } from '../api/types'

// The full set of action strings Stage 3 writes on every mutation.
const auditActions = [
  'member.invite',
  'member.remove',
  'group.create',
  'group.delete',
  'group.member.add',
  'group.member.remove',
  'agent.create',
  'agent.update',
  'agent.delete',
  'grant.create',
  'grant.create.exception',
  'grant.revoke',
  'grant.revoke.exception',
  'policy.update',
]

const allFilter = '__all__'

const toCsv = (events: AuditEvent[]): string => {
  const header = ['timestamp', 'actor', 'action', 'target', 'diff']
  const rows = events.map((event) => [event.ts, event.actor, event.action, event.target, JSON.stringify(event.diff)])
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

/** S6 — Audit log. Lists every mutation Stage 3 records, with an action filter
 *  and a client-side CSV export. */
export const AuditPage = () => {
  const [filter, setFilter] = useState<string>(allFilter)
  const auditQuery = useAudit(filter === allFilter ? undefined : filter)
  const events = auditQuery.data ?? []

  const handleExport = () => {
    const blob = new Blob([toCsv(events)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader title="Audit Log" />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="max-w-xs" aria-label="Filter by action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allFilter}>All actions</SelectItem>
            {auditActions.map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={handleExport} disabled={events.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Diff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditQuery.isPending && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!auditQuery.isPending && events.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No audit events yet.
                </TableCell>
              </TableRow>
            )}
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(event.ts).toLocaleString()}
                </TableCell>
                <TableCell className="whitespace-nowrap">{event.actor}</TableCell>
                <TableCell className="whitespace-nowrap font-medium">{event.action}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">{event.target}</TableCell>
                <TableCell
                  className="max-w-xs truncate font-mono text-xs text-muted-foreground"
                  title={JSON.stringify(event.diff)}
                >
                  {JSON.stringify(event.diff)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
