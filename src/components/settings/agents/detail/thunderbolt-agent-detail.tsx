/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { builtInAgent } from '@/defaults/agents'
import { useLibraryCounts as useLibraryCounts_default } from '@/hooks/use-library-counts'
import { AgentDetailLayout, DetailSection } from './agent-detail-layout'
import { ManageInLibraryLink } from '../manage-in-library-link'
import { formatLibrarySummary, nativeProvenanceLine } from '../agent-provenance'

type ThunderboltAgentDetailProps = {
  onBack: () => void
  onStartChat: () => void
  /** Injectable for tests — production reads live enabled-Library counts. */
  useLibraryCounts?: typeof useLibraryCounts_default
}

/**
 * Read-only info view for the built-in Thunderbolt agent (agents-page-spec §2).
 * NO fields, NO model — the app's only configuration surface is the Library, so
 * "What it uses" is the universal-Library summary with LIVE counts and the
 * instrumented "Manage in Library →" deep link. The single interactive element
 * besides that link is "Start a chat".
 */
export const ThunderboltAgentDetail = ({
  onBack,
  onStartChat,
  useLibraryCounts = useLibraryCounts_default,
}: ThunderboltAgentDetailProps) => {
  const counts = useLibraryCounts()

  return (
    <AgentDetailLayout
      name={builtInAgent.name}
      subtitle={nativeProvenanceLine()}
      body={
        <>
          <DetailSection title="What it uses">
            <p className="text-[length:var(--font-size-body)]">Uses everything enabled in your Library:</p>
            <p className="text-[length:var(--font-size-body)] font-medium" data-testid="library-summary">
              {formatLibrarySummary(counts)}
            </p>
            <ManageInLibraryLink agentKind="thunderbolt" agentId={builtInAgent.id} />
          </DetailSection>

          <DetailSection title="About">
            <p className="text-[length:var(--font-size-body)] text-muted-foreground">
              Runs on your device where the model allows. One Thunderbolt agent per account in this version.
            </p>
          </DetailSection>
        </>
      }
      actions={
        <Button onClick={onStartChat} data-testid="agent-start-chat">
          Start a chat
        </Button>
      }
      onBack={onBack}
    />
  )
}
