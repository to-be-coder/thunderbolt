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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useInviteMember, useMembers, useRemoveMember } from '../api/hooks'
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
  const [email, setEmail] = useState('')
  const [asAdmin, setAsAdmin] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

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

  return (
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
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={asAdmin} onCheckedChange={setAsAdmin} aria-label="Invite as admin" />
              Admin
            </label>
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
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {membersQuery.isPending && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!membersQuery.isPending && members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No members yet. Invite someone to get started.
                </TableCell>
              </TableRow>
            )}
            {members.map((member) => (
              <MemberRow key={member.id} member={member} onRemove={() => remove.mutate(member.id)} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const MemberRow = ({ member, onRemove }: { member: Member; onRemove: () => void }) => (
  <TableRow>
    <TableCell className="font-medium">{member.email}</TableCell>
    <TableCell>
      <StatusPill tone={member.status === 'active' ? 'success' : 'muted'}>{member.status}</StatusPill>
    </TableCell>
    <TableCell>{member.isAdmin ? <StatusPill tone="info">admin</StatusPill> : 'member'}</TableCell>
    <TableCell className="text-right">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm">
            Remove
          </Button>
        </AlertDialogTrigger>
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
