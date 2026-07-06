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
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAgents, useCreateGrant, useGrants, useGroups, useMembers, useRevokeGrant } from '../api/hooks'
import type { Grant, GrantTargetType } from '../api/types'
import { StatusPill } from './status-pill'

/** VERBATIM revocation-consequence copy from the PRD — must render next to the
 *  revoke control (asserted by the colocated test). */
export const revocationConsequenceCopy =
  'Revocation is total: running tasks terminate immediately, sessions invalidate on next refresh, no cached recipe remains.'

/** S4 — Grants. Grant an agent to a group | everyone | individual member; revoke. */
export const GrantsPage = () => {
  const grantsQuery = useGrants()
  const agentsQuery = useAgents()
  const groupsQuery = useGroups()
  const membersQuery = useMembers()
  const createGrant = useCreateGrant()
  const revokeGrant = useRevokeGrant()

  const [agentId, setAgentId] = useState('')
  const [targetType, setTargetType] = useState<GrantTargetType>('group')
  const [targetId, setTargetId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const agents = useMemo(() => agentsQuery.data ?? [], [agentsQuery.data])
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data])
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])

  const agentName = useMemo(() => new Map(agents.map((agent) => [agent.id, agent.name])), [agents])
  const groupName = useMemo(() => new Map(groups.map((group) => [group.id, group.name])), [groups])
  const memberEmail = useMemo(() => new Map(members.map((member) => [member.id, member.email])), [members])

  const needsTarget = targetType !== 'everyone'
  const canGrant = agentId !== '' && (!needsTarget || targetId !== '')

  const handleGrant = async () => {
    if (!canGrant) {
      return
    }
    await createGrant.mutateAsync({
      agentId,
      targetType,
      ...(needsTarget ? { targetId } : {}),
    })
    setTargetId('')
    setDialogOpen(false)
  }

  const describeTarget = (grant: Grant): string => {
    if (grant.targetType === 'everyone') {
      return 'Everyone'
    }
    if (grant.targetType === 'group') {
      return `Group: ${groupName.get(grant.targetId ?? '') ?? grant.targetId}`
    }
    return `Member: ${memberEmail.get(grant.targetId ?? '') ?? grant.targetId}`
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title="Grants">
        <Button
          variant="outline"
          size="icon"
          className="rounded-lg"
          onClick={() => setDialogOpen(true)}
          aria-label="Grant an agent"
        >
          <Plus />
        </Button>
      </PageHeader>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant an agent</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Agent
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="w-52" aria-label="Agent">
                  <SelectValue placeholder="Select agent…" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Target
              <Select
                value={targetType}
                onValueChange={(value) => {
                  setTargetType(value as GrantTargetType)
                  setTargetId('')
                }}
              >
                <SelectTrigger className="w-40" aria-label="Target type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="member">Member (exception)</SelectItem>
                </SelectContent>
              </Select>
            </label>

            {targetType === 'group' && (
              <label className="flex flex-col gap-1 text-sm">
                Group
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="w-52" aria-label="Group">
                    <SelectValue placeholder="Select group…" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}

            {targetType === 'member' && (
              <label className="flex flex-col gap-1 text-sm">
                Member
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="w-52" aria-label="Member">
                    <SelectValue placeholder="Select member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}

            {createGrant.isError && (
              <p className="text-sm text-destructive" role="alert">
                Could not create this grant. It may already exist.
              </p>
            )}
            <div className="flex justify-end">
              <Button onClick={handleGrant} disabled={!canGrant || createGrant.isPending}>
                {createGrant.isPending ? 'Granting…' : 'Grant'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Granted to</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grantsQuery.isPending && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!grantsQuery.isPending && (grantsQuery.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No grants yet.
                </TableCell>
              </TableRow>
            )}
            {(grantsQuery.data ?? []).map((grant) => (
              <TableRow key={grant.id}>
                <TableCell className="font-medium">{agentName.get(grant.agentId) ?? grant.agentId}</TableCell>
                <TableCell>{describeTarget(grant)}</TableCell>
                <TableCell>
                  {grant.targetType === 'member' ? (
                    <StatusPill tone="warning">exception</StatusPill>
                  ) : (
                    <StatusPill tone="muted">{grant.targetType}</StatusPill>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <RevokeButton onRevoke={() => revokeGrant.mutate(grant.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const RevokeButton = ({ onRevoke }: { onRevoke: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
        Revoke
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Revoke this grant?</AlertDialogTitle>
        <AlertDialogDescription>{revocationConsequenceCopy}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onRevoke} className="bg-destructive text-white hover:bg-destructive/90">
          Revoke access
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
