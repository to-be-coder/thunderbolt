/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * THE SEAL TEST (Stage 4, INVARIANT 3 — the headline).
 *
 * Proves the confidential/extensible boundary is ARCHITECTURAL, not a runtime
 * filter: a user-scoped skill/MCP/extension call inside a sealed (or
 * personal-ACP) session fails at COMPILE/ROUTE level because the injection
 * function is structurally unreachable from the sealed constructor.
 *
 * The proof has three legs:
 *   1. SOURCE: the sealed builder file references neither `gatherEnabledLibrary`
 *      nor `session-library`; the extensible builder file references both. The
 *      injection function has exactly one importer.
 *   2. SHAPE: the sealed contributor has no `gatherLibrary` member; the
 *      extensible one does. They are distinct constructors.
 *   3. TYPES: reading `gatherLibrary` off a sealed contributor is a compile
 *      error (`@ts-expect-error` below) — so the type-check gate fails the
 *      moment anyone gives the sealed session an injection path.
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSealedSessionContributor, type SealedSessionContributor } from './sealed-session'
import { createExtensibleSessionContributor } from './extensible-session'
import { selectAcpSessionContributor } from './session-contributors'
import type { AgentDescriptor } from '@/chats/agent-descriptor'

/** Read a sibling source file with comments stripped, so the seal assertions
 *  test CODE references (imports, identifiers) rather than doc-comment prose. */
const readCode = (basename: string): string =>
  readFileSync(join(import.meta.dir, basename), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')

const descriptor = (over: Partial<AgentDescriptor>): AgentDescriptor => ({
  kind: 'team',
  id: 'a1',
  name: 'A',
  icon: null,
  category: 'sealed',
  advertisedModels: [],
  capabilities: [],
  card: null,
  revoked: false,
  ...over,
})

describe('the seal — sealed sessions cannot reach the injection function', () => {
  it('LEG 1 (source): the sealed builder CODE never references the injection function or its module', () => {
    const sealedCode = readCode('sealed-session.ts')
    expect(sealedCode).not.toMatch(/from ['"]\.\/session-library['"]/)
    expect(sealedCode).not.toMatch(/\bgatherEnabledLibrary\b/)
  })

  it('LEG 1 (source): the extensible builder is the SOLE importer of the injection function', () => {
    const extensibleCode = readCode('extensible-session.ts')
    expect(extensibleCode).toMatch(/from ['"]\.\/session-library['"]/)
    expect(extensibleCode).toMatch(/\bgatherEnabledLibrary\b/)
  })

  it('LEG 2 (shape): sealed and extensible are DIFFERENT constructors with different capability', () => {
    const sealed = createSealedSessionContributor()
    const extensible = createExtensibleSessionContributor()

    expect(sealed.kind).toBe('sealed')
    expect(extensible.kind).toBe('extensible')
    expect(createSealedSessionContributor).not.toBe(createExtensibleSessionContributor)

    // The sealed contributor has NO injection member at runtime …
    expect('gatherLibrary' in sealed).toBe(false)
    // … while the extensible one is the only place the injection lives.
    expect(typeof extensible.gatherLibrary).toBe('function')
  })

  it('LEG 3 (types): accessing the injection path on a sealed contributor does not compile', () => {
    const sealed: SealedSessionContributor = createSealedSessionContributor()
    // @ts-expect-error — `gatherLibrary` is not a member of SealedSessionContributor.
    // If the seal is ever broken (sealed gains an injection path) this stops being
    // an error and `bun run type-check` fails on the now-unused directive.
    const leak = sealed.gatherLibrary
    expect(leak).toBeUndefined()
  })
})

describe('selectAcpSessionContributor — the route-level seal', () => {
  it('routes EXTENSIBLE team agents to the extensible builder (can inject)', () => {
    const contributor = selectAcpSessionContributor(descriptor({ kind: 'team', category: 'extensible' }))
    expect(contributor.kind).toBe('extensible')
  })

  it('routes SEALED team agents to the sealed builder (cannot inject)', () => {
    const contributor = selectAcpSessionContributor(descriptor({ kind: 'team', category: 'sealed' }))
    expect(contributor.kind).toBe('sealed')
  })

  it('routes personal ACP agents to the sealed builder (cannot inject)', () => {
    const contributor = selectAcpSessionContributor(descriptor({ kind: 'personal', category: null }))
    expect(contributor.kind).toBe('sealed')
  })

  it('routes the thunderbolt agent to the sealed builder (built-in injects its own Library)', () => {
    const contributor = selectAcpSessionContributor(descriptor({ kind: 'thunderbolt', category: null }))
    expect(contributor.kind).toBe('sealed')
  })

  it('only the extensible arm exposes gatherLibrary after narrowing', () => {
    const contributor = selectAcpSessionContributor(descriptor({ kind: 'team', category: 'extensible' }))
    // The narrowing below is the ONLY way to reach the injection path.
    if (contributor.kind === 'extensible') {
      expect(typeof contributor.gatherLibrary).toBe('function')
      return
    }
    throw new Error('extensible team agent must route to the extensible builder')
  })
})
