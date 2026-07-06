/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Global test setup — preloaded via bunfig.toml before any tests run.
 * Initializes the shared in-memory PGlite database once and closes it after all
 * tests complete (PGlite 0.4.x leaks WASM workers without an explicit close).
 */
import { afterAll } from 'bun:test'
import { adminTestDbManager } from './db'

process.env.DATABASE_DRIVER = 'pglite'

await adminTestDbManager.initialize()

afterAll(async () => {
  await adminTestDbManager.close().catch(() => {})
})
