/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { maxRetries } from '@/chats/chat-instance'
import { reportAgentConnectionFailure } from '@/chats/report-agent-failure'
import type { AgentKind } from '@/dal/chat-threads'
import { isRateLimitError } from '@/lib/error-utils'
import { Loader2, WifiOff } from 'lucide-react'
import { memo, useEffect, useRef } from 'react'

type ErrorMessageProps = {
  retryCount: number
  retriesExhausted: boolean
  error?: Error | null
  onRetry?: () => void
}

export const ErrorMessage = memo(({ retryCount, retriesExhausted, error, onRetry }: ErrorMessageProps) => {
  const rateLimited = isRateLimitError(error)

  // Show rate limit message immediately — don't auto-retry since the server told us to slow down
  if (rateLimited) {
    return (
      <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 mr-auto w-full mt-2">
        <p className="text-amber-500/80 text-[length:var(--font-size-body)]">
          Too many requests. Please try again in a moment.
        </p>
      </div>
    )
  }

  // Show spinner only when a retry is actively in progress (retryCount > 0).
  // retryCount === 0 means either stale error (page refresh) or fresh error
  // before onFinish has scheduled a retry — in both cases show the Retry button.
  if (retryCount > 0 && !retriesExhausted) {
    return (
      <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 mr-auto w-full mt-2">
        <div className="flex items-center gap-2">
          <Loader2 className="size-[var(--icon-size-sm)] text-amber-500 animate-spin" />
          <p className="text-amber-500/80 text-[length:var(--font-size-body)]">
            Something went wrong. Retrying ({retryCount}/{maxRetries})...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 rounded-2xl bg-destructive/10 border border-destructive/20 mr-auto w-full mt-2">
      <div className="flex items-center justify-between gap-2 min-h-[var(--touch-height-sm)]">
        <p className="text-destructive/80 text-[length:var(--font-size-body)]">
          Something went wrong. Please try again.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer shrink-0 text-[length:var(--font-size-body)] font-medium text-destructive/90 bg-destructive/10 hover:bg-destructive/15 px-3 py-1 rounded-xl"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
})

/**
 * The connection-failure message (spec §5), shown in place of the generic error
 * when the agent couldn't be reached at session start. Calm and blame-free; for
 * an agent-side team failure it confirms the report (and emits it, §3.1). A
 * member's own offline state is never claimed as reported.
 */
export const ConnectionFailureMessage = memo(
  ({
    agentName,
    agentKind,
    agentId,
    onRetry,
  }: {
    agentName: string
    agentKind: AgentKind
    agentId: string
    onRetry?: () => void
  }) => {
    const isMemberOffline = typeof navigator !== 'undefined' && navigator.onLine === false

    // Spec §3.1: emit ONE agent-side team failure to the admin plane (deduped
    // admin-side). Member-network failures and personal agents are not reported.
    const reportedRef = useRef(false)
    useEffect(() => {
      if (!isMemberOffline && agentKind === 'team' && !reportedRef.current) {
        reportedRef.current = true
        reportAgentConnectionFailure(agentId, 'unreachable')
      }
    }, [isMemberOffline, agentKind, agentId])

    const message = isMemberOffline
      ? "Couldn't connect. Check your connection and try again."
      : agentKind === 'team'
        ? `Couldn't connect to ${agentName}. This has been reported to your admin.`
        : `Couldn't connect to ${agentName}. Try again.`

    return (
      <div className="px-4 py-3 rounded-2xl bg-destructive/10 border border-destructive/20 mr-auto w-full mt-2">
        <div className="flex items-center justify-between gap-2 min-h-[var(--touch-height-sm)]">
          <span
            className="flex items-center gap-2 text-destructive/80 text-[length:var(--font-size-body)]"
            role="alert"
          >
            <WifiOff className="size-[var(--icon-size-sm)] shrink-0" />
            {message}
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer shrink-0 text-[length:var(--font-size-body)] font-medium text-destructive/90 bg-destructive/10 hover:bg-destructive/15 px-3 py-1 rounded-xl"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  },
)
