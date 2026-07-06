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
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { useState } from 'react'
import {
  useAddGroupMember,
  useCreateGroup,
  useDeleteGroup,
  useGroupMembers,
  useGroups,
  useMembers,
  useRemoveGroupMember,
} from '../api/hooks'
import type { Group, Member } from '../api/types'

/** S3 — Groups. Create/list/delete groups; manage each group's membership. */
export const GroupsPage = () => {
  const groupsQuery = useGroups()
  const createGroup = useCreateGroup()
  const deleteGroup = useDeleteGroup()
  const [name, setName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const groups = groupsQuery.data ?? []
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    const created = await createGroup.mutateAsync(trimmed)
    setName('')
    setSelectedGroupId(created.id)
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title="Groups" />

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Create a group</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Group name (e.g. Legal)"
            className="max-w-xs"
            value={name}
            aria-label="Group name"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={createGroup.isPending || !name.trim()}>
            {createGroup.isPending ? 'Creating…' : 'Create group'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">Groups</h2>
          {groupsQuery.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!groupsQuery.isPending && groups.length === 0 && (
            <p className="text-sm text-muted-foreground">No groups yet.</p>
          )}
          <ul className="flex flex-col gap-1">
            {groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                selected={group.id === selectedGroupId}
                onSelect={() => setSelectedGroupId(group.id)}
                onDelete={() => {
                  deleteGroup.mutate(group.id)
                  if (group.id === selectedGroupId) {
                    setSelectedGroupId(null)
                  }
                }}
              />
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
          {selectedGroup ? (
            <GroupMembership group={selectedGroup} />
          ) : (
            <p className="text-sm text-muted-foreground">Select a group to manage its members.</p>
          )}
        </div>
      </div>
    </div>
  )
}

const GroupRow = ({
  group,
  selected,
  onSelect,
  onDelete,
}: {
  group: Group
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) => (
  <li className={`flex items-center justify-between rounded-md px-2 py-1.5 ${selected ? 'bg-accent' : ''}`}>
    <button type="button" className="flex-1 text-left text-sm font-medium" onClick={onSelect}>
      {group.name}
    </button>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {group.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the group and any grants targeting it. Members keep their individual access. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-destructive text-white hover:bg-destructive/90">
            Delete group
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </li>
)

const GroupMembership = ({ group }: { group: Group }) => {
  const membershipQuery = useGroupMembers(group.id)
  const allMembersQuery = useMembers()
  const addMember = useAddGroupMember(group.id)
  const removeMember = useRemoveGroupMember(group.id)
  const [pendingMemberId, setPendingMemberId] = useState('')

  const current = membershipQuery.data ?? []
  const currentIds = new Set(current.map((member) => member.id))
  const candidates = (allMembersQuery.data ?? []).filter((member) => !currentIds.has(member.id))

  const handleAdd = async (memberId: string) => {
    await addMember.mutateAsync(memberId)
    setPendingMemberId('')
  }

  return (
    <>
      <h2 className="text-sm font-semibold">Members of {group.name}</h2>
      <div className="flex items-center gap-2">
        <Select value={pendingMemberId} onValueChange={handleAdd}>
          <SelectTrigger className="max-w-xs" aria-label="Add member to group">
            <SelectValue placeholder="Add a member…" />
          </SelectTrigger>
          <SelectContent>
            {candidates.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No more members to add</div>
            )}
            {candidates.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ul className="flex flex-col gap-1">
        {current.length === 0 && <li className="text-sm text-muted-foreground">No members in this group.</li>}
        {current.map((member: Member) => (
          <li key={member.id} className="flex items-center justify-between rounded-md px-2 py-1 text-sm">
            <span>{member.email}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${member.email} from group`}
              onClick={() => removeMember.mutate(member.id)}
            >
              <X className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </>
  )
}
