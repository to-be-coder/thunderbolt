/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { isMcpServerAllowed } from './mcp-policy'

describe('isMcpServerAllowed', () => {
  it('allows any server when the allowlist is empty (unrestricted)', () => {
    expect(isMcpServerAllowed({ url: 'https://a.example', name: 'A' }, [])).toBe(true)
  })

  it('allows a server whose URL is in the allowlist', () => {
    expect(isMcpServerAllowed({ url: 'https://a.example', name: 'A' }, ['https://a.example'])).toBe(true)
  })

  it('allows a server whose name is in the allowlist', () => {
    expect(isMcpServerAllowed({ url: null, name: 'Approved' }, ['Approved'])).toBe(true)
  })

  it('rejects a server absent from a non-empty allowlist', () => {
    expect(isMcpServerAllowed({ url: 'https://b.example', name: 'B' }, ['https://a.example'])).toBe(false)
  })
})
