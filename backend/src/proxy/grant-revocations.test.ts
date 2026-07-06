/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it, mock } from 'bun:test'
import { createGrantRevocationHub } from './grant-revocations'

describe('createGrantRevocationHub — in-flight session invalidation', () => {
  it('closes an open session whose caller lost the grant, and keeps a still-granted one', async () => {
    const hub = createGrantRevocationHub()
    const closeAlice = mock(() => {})
    const closeBob = mock(() => {})
    hub.register('agent-1', 'alice@corp.test', closeAlice)
    hub.register('agent-1', 'bob@corp.test', closeBob)

    // Alice's grant was revoked; Bob still has one via another target.
    const stillGranted = mock(async (email: string) => email === 'bob@corp.test')
    await hub.revalidateAgent('agent-1', stillGranted)

    expect(closeAlice).toHaveBeenCalledTimes(1)
    expect(closeBob).not.toHaveBeenCalled()
  })

  it('only affects the revoked agent — sessions to other agents are untouched', async () => {
    const hub = createGrantRevocationHub()
    const closeOnAgent1 = mock(() => {})
    const closeOnAgent2 = mock(() => {})
    hub.register('agent-1', 'alice@corp.test', closeOnAgent1)
    hub.register('agent-2', 'alice@corp.test', closeOnAgent2)

    await hub.revalidateAgent('agent-1', async () => false)

    expect(closeOnAgent1).toHaveBeenCalledTimes(1)
    expect(closeOnAgent2).not.toHaveBeenCalled()
  })

  it('unregister removes the session so a later revalidate cannot close it', async () => {
    const hub = createGrantRevocationHub()
    const close = mock(() => {})
    const unregister = hub.register('agent-1', 'alice@corp.test', close)
    expect(hub.openCount('agent-1')).toBe(1)

    unregister()
    expect(hub.openCount('agent-1')).toBe(0)

    await hub.revalidateAgent('agent-1', async () => false)
    expect(close).not.toHaveBeenCalled()
  })

  it('treats a failing grant re-check as "no longer granted" and closes (fail-closed)', async () => {
    const hub = createGrantRevocationHub()
    const close = mock(() => {})
    hub.register('agent-1', 'alice@corp.test', close)

    await hub.revalidateAgent('agent-1', async () => {
      throw new Error('db down')
    })

    expect(close).toHaveBeenCalledTimes(1)
  })

  it('revalidating an agent with no open sessions is a no-op', async () => {
    const hub = createGrantRevocationHub()
    await hub.revalidateAgent('nobody', async () => true)
    expect(hub.openCount('nobody')).toBe(0)
  })
})
