/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import type { AgentCardCapability } from '@shared/agent-cards'
import { isCapabilityUsable, resolveCapabilityAvailability } from './capability-availability'

const cap = (over: Partial<AgentCardCapability>): AgentCardCapability => ({ label: 'Search', ...over })

describe('resolveCapabilityAvailability — credential modes (T3)', () => {
  it('service_account capabilities are available (run under the org identity)', () => {
    expect(resolveCapabilityAvailability(cap({ credentialMode: 'service_account' }), false)).toEqual({
      state: 'available',
    })
  })

  it('an unspecified credential mode is treated as service identity — available', () => {
    expect(resolveCapabilityAvailability(cap({}), false)).toEqual({ state: 'available' })
  })

  it('as_you + connected + transport passes invoker → available', () => {
    expect(resolveCapabilityAvailability(cap({ credentialMode: 'as_you', connected: true }), true)).toEqual({
      state: 'available',
    })
  })

  it('as_you + NOT connected + transport passes invoker → needs_connection (first-use OAuth)', () => {
    expect(resolveCapabilityAvailability(cap({ credentialMode: 'as_you', connected: false }), true)).toEqual({
      state: 'needs_connection',
    })
  })

  it('DECLINE = unavailable, NEVER a service-account fallback', () => {
    // A declined OAuth leaves `connected` false; the capability stays unavailable
    // and does NOT become available via the service account.
    const declined = resolveCapabilityAvailability(cap({ credentialMode: 'as_you', connected: false }), true)
    expect(declined.state).not.toBe('available')
    expect(isCapabilityUsable(cap({ credentialMode: 'as_you', connected: false }), true)).toBe(false)
  })

  it('as_you on a service-identity-only transport (external team agent) → unsupported_as_you, truthfully', () => {
    // Even "connected" cannot make it work — the relay strips the invoker bearer.
    expect(resolveCapabilityAvailability(cap({ credentialMode: 'as_you', connected: true }), false)).toEqual({
      state: 'unsupported_as_you',
    })
    expect(isCapabilityUsable(cap({ credentialMode: 'as_you', connected: true }), false)).toBe(false)
  })
})
