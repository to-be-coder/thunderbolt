/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCreateGrant, useGrants, useGroups, useMembers, useRevokeGrant } from '../api/hooks'
import type { Grant } from '../api/types'

type AccessMode = 'everyone' | 'restricted' | 'admins'

/**
 * The "Access" tab of the agent detail panel. An agent's access is one MODE:
 *  - Everyone   — anyone in the org (no list).
 *  - Admin only — only admins (shows the read-only admin roster).
 *  - Restricted — only the groups / individuals the admin adds (a "Who can
 *    access" list with a ＋ to add more).
 * The mode is derived from the agent's grants; changing it reveals a Save that
 * reconciles the grants. Restricted adds/removals apply immediately.
 */
export const AgentAccessTab = ({ agentId }: { agentId: string }) => {
  const grantsQuery = useGrants()
  const groupsQuery = useGroups()
  const membersQuery = useMembers()
  const createGrant = useCreateGrant()
  const revokeGrant = useRevokeGrant()

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data])
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const groupName = useMemo(() => new Map(groups.map((group) => [group.id, group.name])), [groups])
  const memberLabel = useMemo(
    () => new Map(members.map((member) => [member.id, member.name || member.email])),
    [members],
  )

  const grants = (grantsQuery.data ?? []).filter((grant) => grant.agentId === agentId)
  const restrictedGrants = grants.filter((grant) => grant.targetType === 'group' || grant.targetType === 'member')
  const adminMembers = members.filter((member) => member.isAdmin)

  const savedMode: AccessMode = grants.some((grant) => grant.targetType === 'everyone')
    ? 'everyone'
    : grants.some((grant) => grant.targetType === 'admins')
      ? 'admins'
      : 'restricted'

  // `null` = follow the saved mode; a value = an unsaved selection.
  const [pending, setPending] = useState<AccessMode | null>(null)
  const mode = pending ?? savedMode
  const dirty = pending !== null && pending !== savedMode
  const busy = createGrant.isPending || revokeGrant.isPending

  const handleSaveMode = async () => {
    if (pending === null) {
      return
    }
    // Drop grants that conflict with the target mode (restricted keeps its
    // group/member grants; everyone / admin-only replace everything).
    for (const grant of grants) {
      const keep = pending === 'restricted' && (grant.targetType === 'group' || grant.targetType === 'member')
      if (!keep) {
        await revokeGrant.mutateAsync(grant.id)
      }
    }
    if (pending === 'everyone') {
      await createGrant.mutateAsync({ agentId, targetType: 'everyone' })
    }
    if (pending === 'admins') {
      await createGrant.mutateAsync({ agentId, targetType: 'admins' })
    }
    setPending(null)
  }

  const describeTarget = (grant: Grant): string =>
    grant.targetType === 'group'
      ? `Group · ${groupName.get(grant.targetId ?? '') ?? grant.targetId}`
      : `Member · ${memberLabel.get(grant.targetId ?? '') ?? grant.targetId}`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">Access</p>
        <div className="flex items-center gap-2">
          <Select value={mode} onValueChange={(value) => setPending(value as AccessMode)}>
            <SelectTrigger className="w-40" aria-label="Access level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">Everyone</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="admins">Admin only</SelectItem>
            </SelectContent>
          </Select>
          {dirty && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setPending(null)} disabled={busy}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSaveMode} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {savedMode === 'everyone' && (
        <p className="text-sm text-muted-foreground">Everyone in your organization can use this agent.</p>
      )}

      {savedMode === 'admins' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Admins with access</p>
          {adminMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admins yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {adminMembers.map((member) => (
                <li key={member.id} className="rounded-md border border-border px-3 py-2 text-sm">
                  {member.name || member.email}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {savedMode === 'restricted' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">Who can access</p>
            <AddAccessPopover
              agentId={agentId}
              groupOptions={groups.map((group) => ({ id: group.id, label: group.name }))}
              memberOptions={members.map((member) => ({ id: member.id, label: member.name || member.email }))}
              createGrant={createGrant}
            />
          </div>
          {restrictedGrants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one yet — add a group or individual with ＋.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {restrictedGrants.map((grant) => (
                <li
                  key={grant.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>{describeTarget(grant)}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Revoke access"
                    onClick={() => revokeGrant.mutate(grant.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** The ＋ control on Restricted access — pick a group or individual and grant it. */
type AccessOption = { id: string; label: string }

const AddAccessPopover = ({
  agentId,
  groupOptions,
  memberOptions,
  createGrant,
}: {
  agentId: string
  groupOptions: AccessOption[]
  memberOptions: AccessOption[]
  createGrant: ReturnType<typeof useCreateGrant>
}) => {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'group' | 'member'>('group')
  const [targetId, setTargetId] = useState('')

  const handleAdd = async () => {
    if (!targetId) {
      return
    }
    await createGrant.mutateAsync({ agentId, targetType: type, targetId })
    setTargetId('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="Add access">
          <Plus className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Add access</p>
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value as 'group' | 'member')
              setTargetId('')
            }}
          >
            <SelectTrigger className="w-full" aria-label="Add type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="group">Group</SelectItem>
              <SelectItem value="member">Individual</SelectItem>
            </SelectContent>
          </Select>

          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="w-full" aria-label={type === 'group' ? 'Group' : 'Member'}>
              <SelectValue placeholder={type === 'group' ? 'Select group…' : 'Select individual…'} />
            </SelectTrigger>
            <SelectContent>
              {(type === 'group' ? groupOptions : memberOptions).map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={!targetId || createGrant.isPending}>
              {createGrant.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
