/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * THE EXTENSIBLE SESSION BUILDER (Stage 4, INVARIANT 3).
 *
 * Extensible team agents accept the member's ENABLED Library. This file is the
 * SOLE importer of `./session-library` — the one and only place the injection
 * function is in scope. `ExtensibleSessionContributor` exposes `gatherLibrary`,
 * so only a session built here can produce a {@link LibraryInjection}.
 */

import { gatherEnabledLibrary, type GatherLibraryInput, type LibraryInjection } from './session-library'

export type GatherLibraryFn = (input: GatherLibraryInput) => Promise<LibraryInjection>

/** An extensible ACP session's contribution: the capability to pull the
 *  member's enabled Library into the session. This is the ONLY contributor type
 *  that carries a `gatherLibrary` method. */
export type ExtensibleSessionContributor = {
  kind: 'extensible'
  gatherLibrary: GatherLibraryFn
}

/** Construct the extensible contributor. Binds `gatherEnabledLibrary` (the
 *  injection function) — injectable for tests. This is the only constructor
 *  with access to the injection path. */
export const createExtensibleSessionContributor = (
  gatherLibrary: GatherLibraryFn = gatherEnabledLibrary,
): ExtensibleSessionContributor => ({
  kind: 'extensible',
  gatherLibrary,
})
