/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { builtInAgent } from '@/defaults/agents'
import { useLibraryCounts as useLibraryCounts_default } from '@/hooks/use-library-counts'
import { AgentDetailLayout, DetailSection } from './agent-detail-layout'
import { ManageInLibraryLink } from '../manage-in-library-link'
import { formatLibrarySummary, nativeProvenanceLine } from '../agent-provenance'

type ThunderboltAgentDetailProps = {
  onBack: () => void
  /** Hides the built-in agent from this member's lists (a user setting — the
   *  agent still exists in code as the chat fallback; nothing is truly deleted). */
  onRemove: () => void
  /** Injectable for tests — production reads live enabled-Library counts. */
  useLibraryCounts?: typeof useLibraryCounts_default
}

/**
 * Read-only info view for the built-in Thunderbolt agent (agents-page-spec §2).
 * NO fields, NO model — the app's only configuration surface is the Library, so
 * "What it uses" is the universal-Library summary with LIVE counts and the
 * instrumented "Manage in Library →" deep link. The ⋯ menu can Remove it, which
 * hides it from the member's lists (a per-user preference, not a hard delete).
 */
export const ThunderboltAgentDetail = ({
  onBack,
  onRemove,
  useLibraryCounts = useLibraryCounts_default,
}: ThunderboltAgentDetailProps) => {
  const counts = useLibraryCounts()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleRemove = () => {
    setConfirmOpen(false)
    onRemove()
  }

  return (
    <>
      <AgentDetailLayout
        name={builtInAgent.name}
        subtitle={nativeProvenanceLine()}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Agent actions" data-testid="thunderbolt-menu">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
                data-testid="thunderbolt-remove"
              >
                Remove agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        body={
          <>
            <DetailSection title="What it uses">
              <p className="text-base">Uses everything enabled in your Library:</p>
              <p className="text-base font-medium" data-testid="library-summary">
                {formatLibrarySummary(counts)}
              </p>
              <ManageInLibraryLink agentKind="thunderbolt" agentId={builtInAgent.id} />
            </DetailSection>

            <DetailSection title="About">
              <p className="text-base text-muted-foreground">
                Runs on your device where the model allows. One Thunderbolt agent per account in this version.
              </p>
            </DetailSection>
          </>
        }
        onBack={onBack}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {builtInAgent.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides the built-in agent from your agents list. It stays available as the app&apos;s fallback and can
              be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              data-testid="thunderbolt-remove-confirm"
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
