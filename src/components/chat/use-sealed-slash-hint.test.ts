/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { SEALED_SLASH_HINT_KEY, useSealedSlashHint } from './use-sealed-slash-hint'

/** A minimal in-memory storage stand-in so tests never touch real localStorage. */
const makeStorage = (seed: Record<string, string> = {}) => {
  const map = new Map(Object.entries(seed))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    _map: map,
  }
}

afterEach(() => {
  mock.restore()
})

describe('useSealedSlashHint', () => {
  it('shows the note and fires the seal-hit signal exactly once on the first slash', () => {
    const trackEvent = mock(() => {})
    const storage = makeStorage()
    const { result } = renderHook(() => useSealedSlashHint({ sealed: true, agentKind: 'team', trackEvent, storage }))

    expect(result.current.visible).toBe(false)

    act(() => result.current.notifySlash())
    expect(result.current.visible).toBe(true)
    expect(trackEvent).toHaveBeenCalledTimes(1)
    expect(trackEvent).toHaveBeenCalledWith('agent_seal_hit', { agent_kind: 'team' })

    // A second slash does not re-fire.
    act(() => result.current.notifySlash())
    expect(trackEvent).toHaveBeenCalledTimes(1)
  })

  it('does not fire for non-sealed agents', () => {
    const trackEvent = mock(() => {})
    const storage = makeStorage()
    const { result } = renderHook(() =>
      useSealedSlashHint({ sealed: false, agentKind: 'thunderbolt', trackEvent, storage }),
    )

    act(() => result.current.notifySlash())
    expect(result.current.visible).toBe(false)
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('persists the dismissal so the note never returns', () => {
    const trackEvent = mock(() => {})
    const storage = makeStorage()
    const { result } = renderHook(() =>
      useSealedSlashHint({ sealed: true, agentKind: 'personal', trackEvent, storage }),
    )

    act(() => result.current.notifySlash())
    act(() => result.current.dismiss())
    expect(result.current.visible).toBe(false)
    expect(storage.getItem(SEALED_SLASH_HINT_KEY)).toBe('1')
  })

  it('never shows again once previously dismissed (persisted flag)', () => {
    const trackEvent = mock(() => {})
    const storage = makeStorage({ [SEALED_SLASH_HINT_KEY]: '1' })
    const { result } = renderHook(() => useSealedSlashHint({ sealed: true, agentKind: 'team', trackEvent, storage }))

    act(() => result.current.notifySlash())
    expect(result.current.visible).toBe(false)
    expect(trackEvent).not.toHaveBeenCalled()
  })
})
