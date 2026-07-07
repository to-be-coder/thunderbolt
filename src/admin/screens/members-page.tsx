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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, MoreHorizontal, Plus, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  useGroups,
  useInviteMember,
  useMemberAgents,
  useMemberGroups,
  useMembers,
  useRemoveMember,
  useSetMemberAdmin,
  useSetMemberGroup,
} from '../api/hooks'
import type { Member } from '../api/types'
import { StatusPill } from './status-pill'

/**
 * S2 — Members. Invite by email (optionally as admin), list with status and
 * is_admin, and remove (soft-delete + session kill on the backend).
 */
export const MembersPage = () => {
  const membersQuery = useMembers()
  const invite = useInviteMember()
  const remove = useRemoveMember()
  const setAdmin = useSetMemberAdmin()
  const [email, setEmail] = useState('')
  const [asAdmin, setAsAdmin] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleInvite = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      return
    }
    await invite.mutateAsync({ email: trimmed, isAdmin: asAdmin })
    setEmail('')
    setAsAdmin(false)
    setDialogOpen(false)
  }

  const members = membersQuery.data ?? []
  const selectedMember = members.find((member) => member.id === selectedId) ?? null

  return (
    <div className="flex h-full w-full min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <PageHeader title="Members">
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg"
              onClick={() => setDialogOpen(true)}
              aria-label="Invite a member"
            >
              <Plus />
            </Button>
          </PageHeader>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a member</DialogTitle>
                <DialogDescription>They'll join your org and activate on first sign-in.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="member-email">Email</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="teammate@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleInvite()}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="member-role">Role</Label>
                  <Select value={asAdmin ? 'admin' : 'member'} onValueChange={(value) => setAsAdmin(value === 'admin')}>
                    <SelectTrigger id="member-role" className="w-full" aria-label="Role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {invite.isError && (
                  <p className="text-sm text-destructive" role="alert">
                    Could not invite this member. They may already exist.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button onClick={handleInvite} disabled={invite.isPending || !email.trim()}>
                    {invite.isPending ? 'Inviting…' : 'Invite'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersQuery.isPending && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!membersQuery.isPending && members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No members yet. Invite someone to get started.
                    </TableCell>
                  </TableRow>
                )}
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    selected={member.id === selectedId}
                    onSelect={() => setSelectedId(member.id)}
                    onRemove={() => remove.mutate(member.id)}
                    onSetAdmin={(isAdmin) => setAdmin.mutate({ id: member.id, isAdmin })}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <SlideInPanel open={selectedMember !== null}>
        <div className="h-full pl-6">
          {selectedMember && <MemberDetailPanel member={selectedMember} onClose={() => setSelectedId(null)} />}
        </div>
      </SlideInPanel>
    </div>
  )
}

const MemberRow = ({
  member,
  selected,
  onSelect,
  onRemove,
  onSetAdmin,
}: {
  member: Member
  selected: boolean
  onSelect: () => void
  onRemove: () => void
  onSetAdmin: (isAdmin: boolean) => void
}) => {
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <TableRow
      onClick={onSelect}
      aria-selected={selected}
      className={cn('cursor-pointer', selected ? 'bg-accent hover:bg-accent' : 'hover:bg-muted/50')}
    >
      <TableCell className="font-medium">{member.name || <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="text-muted-foreground">{member.email}</TableCell>
      <TableCell>
        <StatusPill tone={member.status === 'active' ? 'success' : 'muted'}>{member.status}</StatusPill>
      </TableCell>
      <TableCell className="text-muted-foreground">{member.isAdmin ? 'admin' : 'member'}</TableCell>
      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.email}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSetAdmin(!member.isAdmin)}>
              {member.isAdmin ? 'Remove admin' : 'Make admin'}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {member.email}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the member from the org, drops their group memberships and any individual grants, and
                invalidates their sessions. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRemove} className="bg-destructive text-white hover:bg-destructive/90">
                Remove member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

/** Right-side detail panel for a selected member — identity plus the groups they
 *  currently belong to. */
const MemberDetailPanel = ({ member, onClose }: { member: Member; onClose: () => void }) => {
  const memberGroupsQuery = useMemberGroups(member.id)
  const memberGroups = memberGroupsQuery.data ?? []
  const agentsQuery = useMemberAgents(member.id)
  const agents = agentsQuery.data ?? []
  const setAdmin = useSetMemberAdmin()

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto rounded-lg border border-border p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="truncate text-xl font-semibold">{member.name || member.email}</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close details" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <section className="flex flex-col gap-4">
        <MemberField label="Email">
          <span className="text-sm break-all">{member.email}</span>
        </MemberField>
        <MemberField label="Status">
          <div>
            <StatusPill tone={member.status === 'active' ? 'success' : 'muted'}>{member.status}</StatusPill>
          </div>
        </MemberField>
        <MemberField label="Role">
          <Select
            value={member.isAdmin ? 'admin' : 'member'}
            onValueChange={(value) => setAdmin.mutate({ id: member.id, isAdmin: value === 'admin' })}
          >
            <SelectTrigger className="w-full" aria-label="Role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </MemberField>
        <MemberField label="Groups">
          {memberGroupsQuery.isPending ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : (
            <GroupMultiSelect memberId={member.id} selectedIds={new Set(memberGroups.map((group) => group.id))} />
          )}
        </MemberField>
        <MemberField label="Agent access">
          {agentsQuery.isPending ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : agents.length === 0 ? (
            <span className="text-sm text-muted-foreground">No agents granted.</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {agents.map((agent) => (
                <span key={agent.id} className="rounded-md bg-muted px-2 py-0.5 text-sm">
                  {agent.name}
                </span>
              ))}
            </div>
          )}
        </MemberField>
      </section>
    </div>
  )
}

/** Multi-select over all org groups for a member — a member can belong to many
 *  groups, so toggling an item adds/removes their membership immediately. The
 *  trigger shows the current groups as chips (each removable). */
const GroupMultiSelect = ({ memberId, selectedIds }: { memberId: string; selectedIds: Set<string> }) => {
  const groupsQuery = useGroups()
  const groups = groupsQuery.data ?? []
  const setGroup = useSetMemberGroup(memberId)
  const [open, setOpen] = useState(false)

  const toggle = (groupId: string) => setGroup.mutate({ groupId, member: !selectedIds.has(groupId) })
  const selected = groups.filter((group) => selectedIds.has(group.id))

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>
              {selected.length === 0
                ? 'Not in any group'
                : `${selected.length} group${selected.length === 1 ? '' : 's'}`}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search groups…" />
            <CommandList>
              <CommandEmpty>No groups found</CommandEmpty>
              {groups.map((group) => (
                <CommandItem key={group.id} value={group.name} onSelect={() => toggle(group.id)}>
                  <Check className={cn('size-4', selectedIds.has(group.id) ? 'opacity-100' : 'opacity-0')} />
                  {group.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((group) => (
            <span key={group.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm">
              {group.name}
              <button
                type="button"
                aria-label={`Remove from ${group.name}`}
                onClick={() => toggle(group.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const MemberField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    {children}
  </div>
)
