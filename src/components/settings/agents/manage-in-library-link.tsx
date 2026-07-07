/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ArrowRight } from 'lucide-react'
import { useNavigate as useNavigate_default } from 'react-router'
import { trackEvent as trackEvent_default } from '@/lib/posthog'
import type { AgentKind } from '@/dal/chat-threads'

/** The Library deep-link target — the first Library item. Kept in one place so
 *  every "Manage in Library →" affordance lands identically. */
const LIBRARY_PATH = '/settings/skills'

type ManageInLibraryLinkProps = {
  /** For the demand-signal event payload (agents-page-spec §6). */
  agentKind: AgentKind
  agentId: string
  useNavigate?: typeof useNavigate_default
  trackEvent?: typeof trackEvent_default
}

/**
 * "Manage in Library →" deep link (agents-page-spec §2 / §3). Instruments the
 * tap as `agent_manage_library_tap` — the demand signal the spec §6 calls out
 * for reintroducing per-agent config — then navigates into the Library.
 */
export const ManageInLibraryLink = ({
  agentKind,
  agentId,
  useNavigate = useNavigate_default,
  trackEvent = trackEvent_default,
}: ManageInLibraryLinkProps) => {
  const navigate = useNavigate()

  const handleClick = () => {
    trackEvent('agent_manage_library_tap', { agentKind, agentId })
    navigate(LIBRARY_PATH)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="manage-in-library-link"
      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline cursor-pointer"
    >
      Manage in Library
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </button>
  )
}
