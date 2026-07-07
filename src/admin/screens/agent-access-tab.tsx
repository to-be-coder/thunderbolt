/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCreateGrant, useGrants, useGroups, useMembers, useRevokeGrant } from '../api/hooks'
import type { Grant, GrantTargetType } from '../api/types'

/**
 * The "Access" tab of the agent detail panel — who can reach THIS agent, and the
 * controls to grant it to a group / everyone / an individual member (moved here
 * from the standalone Grants screen so access lives with the agent).
 */
export const AgentAccessTab = ({ agentId }: { agentId: string }) => {
  const grantsQuery = useGrants()
  const groupsQuery = useGroups()
  const membersQuery = useMembers()
  const createGrant = useCreateGrant()
  const revokeGrant = useRevokeGrant()

  // High-level access choice; "limited" then narrows to a group or an individual.
  const [access, setAccess] = useState<'everyone' | 'limited' | 'admins'>('limited')
  const [limitedType, setLimitedType] = useState<'group' | 'member'>('group')
  const [targetId, setTargetId] = useState('')

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data])
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const groupName = useMemo(() => new Map(groups.map((group) => [group.id, group.name])), [groups])
  const memberLabel = useMemo(
    () => new Map(members.map((member) => [member.id, member.name || member.email])),
    [members],
  )

  const grants = (grantsQuery.data ?? []).filter((grant) => grant.agentId === agentId)

  const needsTarget = access === 'limited'
  const canGrant = !needsTarget || targetId !== ''

  const handleGrant = async () => {
    if (!canGrant) {
      return
    }
    const targetType: GrantTargetType =
      access === 'everyone' ? 'everyone' : access === 'admins' ? 'admins' : limitedType
    await createGrant.mutateAsync({ agentId, targetType, ...(needsTarget ? { targetId } : {}) })
    setTargetId('')
  }

  const describeTarget = (grant: Grant): string => {
    if (grant.targetType === 'everyone') {
      return 'Everyone'
    }
    if (grant.targetType === 'admins') {
      return 'Admins only'
    }
    if (grant.targetType === 'group') {
      return `Group · ${groupName.get(grant.targetId ?? '') ?? grant.targetId}`
    }
    return `Member · ${memberLabel.get(grant.targetId ?? '') ?? grant.targetId}`
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">Who can access</p>
        {grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not granted to anyone yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {grants.map((grant) => (
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

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <p className="text-sm font-medium text-muted-foreground">Grant access</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={access}
            onValueChange={(value) => {
              setAccess(value as 'everyone' | 'limited' | 'admins')
              setTargetId('')
            }}
          >
            <SelectTrigger className="w-40" aria-label="Access level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">Everyone</SelectItem>
              <SelectItem value="limited">Limited</SelectItem>
              <SelectItem value="admins">Admin only</SelectItem>
            </SelectContent>
          </Select>

          {access === 'limited' && (
            <>
              <Select
                value={limitedType}
                onValueChange={(value) => {
                  setLimitedType(value as 'group' | 'member')
                  setTargetId('')
                }}
              >
                <SelectTrigger className="w-32" aria-label="Limit to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="member">Individual</SelectItem>
                </SelectContent>
              </Select>

              {limitedType === 'group' ? (
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="w-48" aria-label="Group">
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
              ) : (
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="w-48" aria-label="Member">
                    <SelectValue placeholder="Select individual…" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}

          <Button onClick={handleGrant} disabled={!canGrant || createGrant.isPending}>
            {createGrant.isPending ? 'Granting…' : 'Grant'}
          </Button>
        </div>
        {createGrant.isError && (
          <p className="text-sm text-destructive" role="alert">
            Could not create this grant. It may already exist.
          </p>
        )}
      </div>
    </div>
  )
}
