/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * THE SEAL ROUTER (Stage 4, INVARIANT 3).
 *
 * Maps an {@link AgentDescriptor} to the ONE session builder that constructs its
 * ACP session. There are two mutually-exclusive builders, in two files:
 *
 *   - `extensible-session.ts` — the ONLY module that imports the injection
 *     function (`session-library.ts`). Its contributor carries `gatherLibrary`.
 *   - `sealed-session.ts` — imports NOTHING library-related. Its contributor has
 *     no `gatherLibrary` method.
 *
 * `SessionContributor` is their discriminated union. To reach the injection path
 * a caller MUST first narrow on `kind === 'extensible'`; writing
 * `contributor.gatherLibrary(...)` without that narrowing is a COMPILE error
 * (the sealed arm has no such member). That is the route-level seal: sealed and
 * personal ACP sessions cannot reach the injection function at all.
 *
 * One identical rule for skills, MCPs, and extensions: they all travel inside
 * the single {@link LibraryInjection} that only `gatherLibrary` can produce.
 */

import type { AgentDescriptor } from '@/chats/agent-descriptor'
import { createExtensibleSessionContributor, type ExtensibleSessionContributor } from './extensible-session'
import { createSealedSessionContributor, type SealedSessionContributor } from './sealed-session'

export type { ExtensibleSessionContributor } from './extensible-session'
export type { SealedSessionContributor } from './sealed-session'
export type { LibraryInjection } from './session-library'

/** Every ACP session is built by exactly one of these. Narrow on `kind` to
 *  reach the extensible arm's `gatherLibrary`; the sealed arm has no such
 *  member, so injection is unreachable from it. */
export type SessionContributor = ExtensibleSessionContributor | SealedSessionContributor

/**
 * Route a descriptor to its session builder. EXTENSIBLE team agents get the
 * builder that can inject the Library; SEALED team agents and ALL personal ACP
 * agents get the sealed builder that cannot. The Thunderbolt (built-in) agent
 * never reaches here — it runs through the built-in adapter, which injects its
 * own Library in `ai/fetch.ts` — but it maps to the sealed builder defensively
 * so no ACP-side injection can ever attach to it.
 */
export const selectAcpSessionContributor = (descriptor: AgentDescriptor): SessionContributor =>
  descriptor.kind === 'team' && descriptor.category === 'extensible'
    ? createExtensibleSessionContributor()
    : createSealedSessionContributor()
