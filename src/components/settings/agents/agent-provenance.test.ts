/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import {
  acpHost,
  companyProvenanceLine,
  formatLibrarySummary,
  nativeProvenanceLine,
  personalProvenanceLine,
} from './agent-provenance'

describe('companyProvenanceLine', () => {
  it('uses the "works with your skills" copy for extensible agents', () => {
    expect(companyProvenanceLine({ managedBy: 'ACME', category: 'extensible' })).toBe(
      'From ACME · works with your skills',
    )
  })

  it('uses the "comes fully configured" copy for sealed agents', () => {
    expect(companyProvenanceLine({ managedBy: 'ACME', category: 'sealed' })).toBe('From ACME · comes fully configured')
  })
})

describe('nativeProvenanceLine', () => {
  it('is the exact spec copy', () => {
    expect(nativeProvenanceLine()).toBe('Your agent · uses your Library')
  })
})

describe('acpHost', () => {
  it('extracts the host from a wss URL', () => {
    expect(acpHost('wss://home.example.dev/agent')).toBe('home.example.dev')
  })

  it('returns the raw string for an unparseable URL', () => {
    expect(acpHost('not a url')).toBe('not a url')
  })

  it('returns empty string for null', () => {
    expect(acpHost(null)).toBe('')
  })
})

describe('personalProvenanceLine', () => {
  it('renders "Connected agent · {host}"', () => {
    expect(personalProvenanceLine('wss://home.example.dev/agent')).toBe('Connected agent · home.example.dev')
  })
})

describe('formatLibrarySummary', () => {
  it('pluralizes each unit correctly', () => {
    expect(formatLibrarySummary({ skills: 4, mcpServers: 2, extensions: 1 })).toBe(
      '4 skills · 2 MCP servers · 1 extension',
    )
  })

  it('uses singular forms for counts of one', () => {
    expect(formatLibrarySummary({ skills: 1, mcpServers: 1, extensions: 1 })).toBe(
      '1 skill · 1 MCP server · 1 extension',
    )
  })

  it('handles zero counts as plural', () => {
    expect(formatLibrarySummary({ skills: 0, mcpServers: 0, extensions: 0 })).toBe(
      '0 skills · 0 MCP servers · 0 extensions',
    )
  })
})
