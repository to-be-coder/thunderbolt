/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useState } from 'react'
import { Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAcpAgentStatus as useAcpAgentStatus_default, type AcpAgentStatus } from '@/hooks/use-acp-agent-status'
import type { Agent } from '@/types/acp'
import { AgentDetailLayout, DetailSection } from './agent-detail-layout'
import { personalProvenanceLine } from '../agent-provenance'

/** The Status line's dot + label for the personal detail (agents-page-spec §4). */
const StatusValue = ({ status }: { status: AcpAgentStatus }) => {
  if (status === 'checking') {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground" data-testid="personal-status">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Checking…
      </span>
    )
  }
  if (status === 'online') {
    return (
      <span className="inline-flex items-center gap-1.5" data-testid="personal-status">
        <span className="inline-block size-2 rounded-full bg-green-500" aria-hidden="true" />
        Connected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground" data-testid="personal-status">
      <span className="inline-block size-2 rounded-full border border-muted-foreground" aria-hidden="true" />
      Offline
    </span>
  )
}

type PersonalAgentDetailProps = {
  agent: Agent
  onBack: () => void
  /** Soft-deletes the reference only — nothing on the remote server is touched. */
  onRemove: () => void
  useAcpAgentStatus?: typeof useAcpAgentStatus_default
}

/**
 * Thin management view for a personal ACP agent (agents-page-spec §4). The
 * agent's brain lives on the other end of the URL, so this view is read-only
 * apart from Test (re-runs the connection probe) and Remove. The About block
 * gently explains the seal — the member's Library items don't apply here — and
 * NO capability list is cached across disconnects. There is no Start a chat and
 * nothing configurable.
 */
export const PersonalAgentDetail = ({
  agent,
  onBack,
  onRemove,
  useAcpAgentStatus = useAcpAgentStatus_default,
}: PersonalAgentDetailProps) => {
  const { status, refresh } = useAcpAgentStatus(agent.url)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleRemove = () => {
    setConfirmOpen(false)
    onRemove()
  }

  return (
    <AgentDetailLayout
      icon={Globe}
      name={agent.name}
      subtitle={personalProvenanceLine(agent.url)}
      body={
        <>
          <dl className="flex flex-col gap-3">
            <div className="flex items-baseline gap-4">
              <dt className="w-24 shrink-0 text-[length:var(--font-size-sm)] text-muted-foreground">Endpoint</dt>
              <dd className="min-w-0 break-all text-[length:var(--font-size-body)]" data-testid="personal-endpoint">
                {agent.url}
              </dd>
            </div>
            <div className="flex items-center gap-4">
              <dt className="w-24 shrink-0 text-[length:var(--font-size-sm)] text-muted-foreground">Status</dt>
              <dd className="flex items-center gap-3 text-[length:var(--font-size-body)]">
                <StatusValue status={status} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refresh}
                  disabled={status === 'checking'}
                  data-testid="personal-test"
                >
                  Test
                </Button>
              </dd>
            </div>
          </dl>

          <DetailSection title="About">
            <p className="text-[length:var(--font-size-body)] text-muted-foreground">
              This agent is configured on its own server — its model, skills, and tools come with it. Your Library items
              don&apos;t apply here.
            </p>
          </DetailSection>
        </>
      }
      actions={
        <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
          <PopoverTrigger asChild>
            <Button variant="destructive" data-testid="personal-remove">
              Remove agent
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Remove {agent.name}?</h4>
                <p className="text-[length:var(--font-size-sm)] text-muted-foreground">
                  This removes the connection from Thunderbolt only. Nothing on the remote server is changed.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleRemove} data-testid="personal-remove-confirm">
                  Remove
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      }
      onBack={onBack}
    />
  )
}
