/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PGlite } from '@electric-sql/pglite'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { resolve } from 'path'
import type { AdminDb } from '../db/types'
import * as schema from '../db/schema'

/**
 * In-memory PGlite harness for admin-service tests. Migrates ONLY the
 * admin-service's own `drizzle/` folder — the package is self-contained, so no
 * backend tables are needed (session invalidation is exercised through the
 * injected `revokeSessionsForEmail` spy). Mirrors backend's transaction-isolation
 * pattern: each test opens a Drizzle transaction and rolls back on cleanup.
 */
class AdminTestDbManager {
  private client: PGlite | null = null
  private db: AdminDb | null = null
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }
    this.client = new PGlite({ extensions: { uuid_ossp } })
    this.db = drizzle({ client: this.client, schema }) as unknown as AdminDb
    const migrationsFolder = resolve(import.meta.dir, '../../drizzle')
    await migrate(this.db as never, { migrationsFolder })
    this.initialized = true
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
      this.initialized = false
    }
  }

  async createTestDb(): Promise<{ db: AdminDb; cleanup: () => Promise<void> }> {
    if (!this.initialized) {
      await this.initialize()
    }

    const rollbackSentinel = new Error('__admin_test_cleanup_rollback__')
    let resolveTx!: (tx: AdminDb) => void
    let signalRollback!: () => void

    const txReady = new Promise<AdminDb>((res) => {
      resolveTx = res
    })

    const txDone = (this.db as unknown as { transaction: (fn: (tx: AdminDb) => Promise<void>) => Promise<void> })
      .transaction(async (tx) => {
        resolveTx(tx)
        await new Promise<void>((_, reject) => {
          signalRollback = () => reject(rollbackSentinel)
        })
      })
      .catch((err) => {
        if (err !== rollbackSentinel) {
          throw err
        }
      })

    const tx = await txReady
    return {
      db: tx,
      cleanup: async () => {
        signalRollback()
        await txDone
      },
    }
  }
}

export const adminTestDbManager = new AdminTestDbManager()

/** Open an isolated (transaction-wrapped) admin-service test database. */
export const createTestDb = () => adminTestDbManager.createTestDb()
