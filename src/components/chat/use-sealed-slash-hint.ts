/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { trackEvent as trackEvent_default } from '@/lib/posthog'
import { useRef, useState } from 'react'

/** localStorage key holding the one-time dismissal of the sealed-agent slash note. */
export const SEALED_SLASH_HINT_KEY = 'thunderbolt.sealedSlashHintDismissed'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const safeStorage = (): StorageLike | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

type UseSealedSlashHintParams = {
  /** True when the active agent has no skills surface (sealed team / personal ACP). */
  sealed: boolean
  /** Passed to telemetry so the seal-hit signal carries which kind was hit. */
  agentKind: string
  trackEvent?: typeof trackEvent_default
  storage?: StorageLike | null
}

/**
 * Drives the one-time educational note raised on the first `/` in a sealed /
 * personal-ACP thread (T3). Shows the note and fires the P2 `agent_seal_hit`
 * demand signal exactly once — the dismissal is persisted in localStorage so the
 * note never returns, and the telemetry fires only alongside that first note.
 */
export const useSealedSlashHint = ({
  sealed,
  agentKind,
  trackEvent = trackEvent_default,
  storage,
}: UseSealedSlashHintParams) => {
  const store = storage === undefined ? safeStorage() : storage
  const [visible, setVisible] = useState(false)
  const firedRef = useRef(false)

  const notifySlash = () => {
    if (!sealed || firedRef.current) {
      return
    }
    if (store?.getItem(SEALED_SLASH_HINT_KEY) === '1') {
      return
    }
    firedRef.current = true
    setVisible(true)
    trackEvent('agent_seal_hit', { agent_kind: agentKind })
  }

  const dismiss = () => {
    store?.setItem(SEALED_SLASH_HINT_KEY, '1')
    setVisible(false)
  }

  return { visible, notifySlash, dismiss }
}
