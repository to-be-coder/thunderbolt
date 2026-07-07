/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { testAcpConnection as testAcpConnection_default } from '@/acp'
import type { AgentDescriptor } from '@/chats/agent-descriptor'
import type { ConnectionStatus } from '@/chats/chat-store'
import { Button } from '@/components/ui/button'
import { AlertCircle, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { useNavigate as useNavigate_default } from 'react-router'

/** Which of the three Stage-5 thread states (if any) blocks the composer. */
export type ComposerBlockState = { kind: 'revoked' } | { kind: 'offline' } | { kind: 'no-models' } | null

/**
 * Derive the composer block state during render (no effect). Precedence:
 * revoked team grant → personal-ACP offline → Thunderbolt with zero models.
 */
export const resolveComposerBlock = (params: {
  descriptor: AgentDescriptor
  connectionStatus: ConnectionStatus
  connectionError: Error | null
  modelCount: number
}): ComposerBlockState => {
  const { descriptor, connectionStatus, connectionError, modelCount } = params

  if (descriptor.kind === 'team' && descriptor.revoked) {
    return { kind: 'revoked' }
  }
  // A failed connection at session start blocks the composer for any connected
  // agent kind — personal ACP or team (spec §5). Thunderbolt never connects.
  if (
    (descriptor.kind === 'personal' || descriptor.kind === 'team') &&
    connectionStatus === 'error' &&
    connectionError != null
  ) {
    return { kind: 'offline' }
  }
  if (descriptor.kind === 'thunderbolt' && modelCount === 0) {
    return { kind: 'no-models' }
  }
  return null
}

type ComposerBlockProps = {
  state: NonNullable<ComposerBlockState>
  descriptor: AgentDescriptor
  /** Personal ACP endpoint, for the offline "Test" probe. */
  agentUrl: string | null
  testAcpConnection?: typeof testAcpConnection_default
  useNavigate?: typeof useNavigate_default
}

/**
 * Replaces the composer when a thread can't accept input (T5). Read-only banner
 * for a revoked team grant; an offline notice + Test affordance for an offline
 * personal ACP agent; a "Connect a model" prompt deep-linking Settings → Models
 * when the Thunderbolt agent has no connected models.
 */
export const ComposerBlock = ({
  state,
  descriptor,
  agentUrl,
  testAcpConnection = testAcpConnection_default,
  useNavigate = useNavigate_default,
}: ComposerBlockProps) => {
  const navigate = useNavigate()
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  if (state.kind === 'revoked') {
    return (
      <div
        role="alert"
        className="flex items-center justify-center gap-2 rounded-2xl border bg-card px-4 py-3 text-muted-foreground text-[length:var(--font-size-sm)]"
      >
        <AlertCircle className="size-[var(--icon-size-default)] shrink-0" />
        <span>Your access to this agent was removed.</span>
      </div>
    )
  }

  if (state.kind === 'no-models') {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-center">
        <span className="text-muted-foreground text-[length:var(--font-size-sm)]">
          {descriptor.name} needs a model before you can chat.
        </span>
        <Button size="sm" onClick={() => navigate('/settings/models')}>
          Connect a model
        </Button>
      </div>
    )
  }

  const handleTest = async () => {
    if (!agentUrl) {
      setTestResult('No endpoint configured for this agent.')
      return
    }
    setIsTesting(true)
    setTestResult(null)
    const result = await testAcpConnection({ url: agentUrl })
    setIsTesting(false)
    setTestResult(result.success ? 'Connection restored — reopen the chat to continue.' : result.error)
  }

  // Spec §5: only an AGENT-side failure was reported to the admin — a member's
  // own offline state was not, so the copy must not claim a report was sent.
  const isMemberOffline = typeof navigator !== 'undefined' && navigator.onLine === false
  const message = isMemberOffline
    ? "Couldn't connect. Check your connection and try again."
    : `Couldn't connect to ${descriptor.name}. This has been reported to your admin.`

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-center">
      <div className="flex items-center gap-2 text-muted-foreground text-[length:var(--font-size-sm)]">
        <WifiOff className="size-[var(--icon-size-default)] shrink-0" />
        <span role="alert">{message}</span>
      </div>
      {/* Members can only re-probe their own (personal) endpoint. */}
      {agentUrl && (
        <>
          <Button size="sm" variant="outline" disabled={isTesting} onClick={handleTest}>
            {isTesting ? 'Testing…' : 'Test connection'}
          </Button>
          {testResult && (
            <span role="status" className="text-muted-foreground text-[length:var(--font-size-xs)]">
              {testResult}
            </span>
          )}
        </>
      )}
    </div>
  )
}
