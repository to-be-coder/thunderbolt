/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * THE SEALED SESSION BUILDER (Stage 4, INVARIANT 3).
 *
 * Sealed team agents AND all personal ACP agents run EXACTLY as configured —
 * the member's Library is never exposed to them. This file is deliberately
 * inert: it imports NOTHING from `./session-library` and has no reference to
 * `gatherEnabledLibrary`. That absence is the seal — verified by
 * `session-contributors.test.ts`, which reads this file's source and asserts it
 * cannot reach the injection path.
 *
 * `SealedSessionContributor` has no `gatherLibrary` method. A user-scoped
 * skill/MCP/extension call inside a sealed session therefore fails at
 * COMPILE/ROUTE level: there is no method on this type to produce a
 * `LibraryInjection`, so the code that would inject one does not type-check.
 */

/** A sealed ACP session's contribution to the connection: nothing. The type
 *  carries NO field or method capable of returning user-scoped Library items —
 *  this is the structural seal, not a runtime `if (sealed) skip`. */
export type SealedSessionContributor = {
  kind: 'sealed'
}

/** Construct the sealed contributor. Takes no dependencies and returns no
 *  injection capability — by construction it cannot expose the Library. */
export const createSealedSessionContributor = (): SealedSessionContributor => ({
  kind: 'sealed',
})
