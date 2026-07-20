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
} from '@/components/ui/alert-dialog'
import { SlideInPanel } from '@/components/slide-in-panel'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { AdminPageHeader } from '../admin-chrome'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, MoreHorizontal, Plus, Users, X } from 'lucide-react'
import { useRef, useState } from 'react'
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

/**
 * S3 — Groups. Mirrors the Registry layout: the group list fills the page until
 * one is selected; then the detail slides in from the right (an inline flex
 * child — no overlay) and the list shrinks. Membership is managed in the detail;
 * Delete lives in its ⋯ menu. The `+` opens the create-group modal.
 */
export const GroupsPage = () => {
  const groupsQuery = useGroups()
  const createGroup = useCreateGroup()
  const [name, setName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const groups = groupsQuery.data ?? []
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null

  // Latch the last selected group so it stays rendered through the close
  // animation (ref assignment in render is the sanctioned no-effect pattern).
  const lastGroup = useRef<Group | null>(selectedGroup)
  if (selectedGroup) {
    lastGroup.current = selectedGroup
  }
  const panelGroup = selectedGroup ?? lastGroup.current
  const open = selectedGroup !== null

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    const created = await createGroup.mutateAsync(trimmed)
    setName('')
    setSelectedGroupId(created.id)
    setDialogOpen(false)
  }

  return (
    <div className="relative -my-6 flex h-[calc(100%_+_3rem)] w-full min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto pr-6">
        <div className="mx-auto flex w-full max-w-[728px] flex-col gap-6 pt-0 pb-6 md:pt-6">
          <AdminPageHeader title="Groups">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-md bg-card hover:bg-accent md:size-[var(--touch-height-default)] md:rounded-lg"
              onClick={() => setDialogOpen(true)}
              aria-label="Create a group"
            >
              <Plus />
            </Button>
          </AdminPageHeader>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader className="sm:text-center">
                <DialogTitle>Create a group</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <Input
                  placeholder="Group name (e.g. Legal)"
                  value={name}
                  aria-label="Group name"
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleCreate()}
                />
                <div className="flex justify-end">
                  <Button onClick={handleCreate} disabled={createGroup.isPending || !name.trim()}>
                    {createGroup.isPending ? 'Creating…' : 'Create group'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex flex-col gap-2">
            {groupsQuery.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!groupsQuery.isPending && groups.length === 0 && (
              <p className="text-sm text-muted-foreground">No groups yet.</p>
            )}
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                selected={group.id === selectedGroupId}
                onSelect={() => setSelectedGroupId(group.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <SlideInPanel open={open}>
        <div className="h-full border-l border-border/30 pl-6">
          {panelGroup && (
            <GroupDetailPanel
              key={panelGroup.id}
              group={panelGroup}
              onClose={() => setSelectedGroupId(null)}
              onDeleted={() => setSelectedGroupId(null)}
            />
          )}
        </div>
      </SlideInPanel>
    </div>
  )
}

const GroupCard = ({ group, selected, onSelect }: { group: Group; selected: boolean; onSelect: () => void }) => {
  const membersQuery = useGroupMembers(group.id)
  const count = membersQuery.data?.length ?? 0

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`group-card-${group.id}`}
      aria-label={`Open ${group.name}`}
      aria-pressed={selected}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors',
        selected ? 'bg-accent' : 'hover:bg-secondary/50',
      )}
    >
      <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Users className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{group.name}</div>
        <p className="text-sm text-muted-foreground">
          {membersQuery.isPending ? '…' : `${count} member${count === 1 ? '' : 's'}`}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}

/** Right-side detail panel for a selected group — membership management with a
 *  ⋯ Delete action, styled to match the Registry / Members detail panels. */
const GroupDetailPanel = ({
  group,
  onClose,
  onDeleted,
}: {
  group: Group
  onClose: () => void
  onDeleted: () => void
}) => {
  const deleteGroup = useDeleteGroup()
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="relative flex h-full flex-col overflow-hidden pt-6">
      <div className="flex h-[var(--touch-height-xl)] shrink-0 items-center justify-between gap-3">
        <h2 className="min-w-0 flex-1 truncate text-xl font-semibold">{group.name}</h2>
        {/* Actions on the right: the ⋯ menu sits next to the close (X). */}
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Group actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close details"
            onClick={onClose}
            className="size-8 rounded-md border border-border md:size-[var(--touch-height-sm)] md:rounded-lg md:border-0"
          >
            <X className="size-4" />
          </Button>
        </div>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
              <AlertDialogAction
                onClick={() => {
                  deleteGroup.mutate(group.id)
                  onDeleted()
                }}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete group
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <section className="flex flex-1 flex-col gap-4 overflow-y-auto pt-4 pb-6">
        <GroupMembership group={group} />
      </section>
    </div>
  )
}

/** The leading toggle icon of a member row in the search list. A member shows a
 *  green check, a non-member a muted plus; clicking morphs one into the other
 *  (rotate + scale) — the plus rotates out while the check rotates in, and back. */
const ToggleIcon = ({ checked }: { checked: boolean }) => (
  <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
    <Plus
      className={cn(
        'absolute size-4 text-muted-foreground transition-all duration-300 ease-out',
        checked ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
      )}
    />
    <Check
      className={cn(
        'absolute size-4 text-green-600 transition-all duration-300 ease-out dark:text-green-500',
        checked ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
      )}
    />
  </span>
)

const GroupMembership = ({ group }: { group: Group }) => {
  const membershipQuery = useGroupMembers(group.id)
  const allMembersQuery = useMembers()
  const addMember = useAddGroupMember(group.id)
  const removeMember = useRemoveGroupMember(group.id)
  const [focused, setFocused] = useState(false)
  // In-flight toggles: 'add' | 'remove' per member id. Drives the morph and lets
  // the icon flip instantly on click while the mutation commits after it plays.
  const [pending, setPending] = useState<Record<string, 'add' | 'remove'>>({})

  const current = membershipQuery.data ?? []
  const currentIds = new Set(current.map((member) => member.id))
  const allMembers = allMembersQuery.data ?? []

  const isChecked = (memberId: string) => {
    const state = pending[memberId]
    return state === 'add' ? true : state === 'remove' ? false : currentIds.has(memberId)
  }

  // Flip the icon immediately (via `pending`) so the morph plays, then commit the
  // add/remove once it finishes.
  const handleToggle = (memberId: string) => {
    if (pending[memberId]) {
      return
    }
    const removing = currentIds.has(memberId)
    setPending((prev) => ({ ...prev, [memberId]: removing ? 'remove' : 'add' }))
    setTimeout(() => {
      if (removing) {
        removeMember.mutate(memberId)
      } else {
        addMember.mutate(memberId)
      }
      setPending((prev) => {
        const next = { ...prev }
        delete next[memberId]
        return next
      })
    }, 450)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">Add or remove members</p>
      <Command
        // Dictionary-style substring match: empty query shows everyone, typing
        // narrows to names/emails that CONTAIN the query (not cmdk's fuzzy scorer).
        filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0)}
        className="relative overflow-visible rounded-lg border border-border [&_[data-slot=command-input-wrapper]]:border-b-0"
      >
        <CommandInput placeholder="Search members…" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        {/* Floated so revealing it OVERLAYS the members list below rather than
            pushing it down. `onMouseDown` preventDefault keeps the input focused
            so a click lands on the item instead of blurring the list away first. */}
        {focused && (
          <CommandList
            className="absolute inset-x-0 top-full z-50 mt-1 max-h-56 rounded-xl border border-border bg-popover shadow-md"
            onMouseDown={(event) => event.preventDefault()}
          >
            <CommandEmpty>No members found</CommandEmpty>
            {allMembers.map((member) => (
              <CommandItem
                key={member.id}
                value={member.name ? `${member.name} ${member.email}` : member.email}
                onSelect={() => handleToggle(member.id)}
              >
                <ToggleIcon checked={isChecked(member.id)} />
                {member.name || member.email}
              </CommandItem>
            ))}
          </CommandList>
        )}
      </Command>

      <p className="mt-2 text-sm font-medium text-muted-foreground">Members</p>
      <ul className="flex flex-col gap-1.5">
        {current.length === 0 && <li className="text-sm text-muted-foreground">No members in this group.</li>}
        {current.map((member: Member) => (
          <li
            key={member.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="truncate">{member.name || member.email}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${member.name || member.email} from group`}
              onClick={() => removeMember.mutate(member.id)}
            >
              <X className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
