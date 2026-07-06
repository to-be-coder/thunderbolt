/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { isMcpServerAllowed } from './mcp-policy'

const server = { url: 'https://a.example', name: 'A' }

describe('isMcpServerAllowed', () => {
  it('allow mode permits any server', () => {
    expect(isMcpServerAllowed(server, { mcpPolicy: 'allow', mcpAllowlist: [] })).toBe(true)
    expect(isMcpServerAllowed({ url: 'https://b.example', name: 'B' }, { mcpPolicy: 'allow', mcpAllowlist: [] })).toBe(
      true,
    )
  })

  it('block mode permits nothing', () => {
    expect(isMcpServerAllowed(server, { mcpPolicy: 'block', mcpAllowlist: ['https://a.example'] })).toBe(false)
  })

  it('allowlist mode permits a server by URL', () => {
    expect(isMcpServerAllowed(server, { mcpPolicy: 'allowlist', mcpAllowlist: ['https://a.example'] })).toBe(true)
  })

  it('allowlist mode permits a server by name', () => {
    expect(
      isMcpServerAllowed({ url: null, name: 'Approved' }, { mcpPolicy: 'allowlist', mcpAllowlist: ['Approved'] }),
    ).toBe(true)
  })

  it('allowlist mode rejects a server absent from the list', () => {
    expect(
      isMcpServerAllowed(
        { url: 'https://b.example', name: 'B' },
        { mcpPolicy: 'allowlist', mcpAllowlist: ['https://a.example'] },
      ),
    ).toBe(false)
  })

  it('allowlist mode with an empty list blocks everything (secure default)', () => {
    expect(isMcpServerAllowed(server, { mcpPolicy: 'allowlist', mcpAllowlist: [] })).toBe(false)
  })
})
