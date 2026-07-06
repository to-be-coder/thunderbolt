/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { resolve } from 'path'
import type { AdminDb } from './types'

/** Distinct journal table so the admin-service migration history never clobbers
 *  backend's default `drizzle.__drizzle_migrations` on the shared database. */
export const adminMigrationsTable = '__admin_migrations'

/** Resolve the admin-service migrations folder. Override with
 *  `ADMIN_MIGRATIONS_DIR`; defaults to `<package>/drizzle`. */
export const getAdminMigrationsFolder = (): string =>
  process.env.ADMIN_MIGRATIONS_DIR ?? resolve(import.meta.dir, '../../drizzle')

/**
 * Apply the admin-service migrations to the shared database. Call this from the
 * host's `startServer()` right after backend's `runMigrations()`. Uses the same
 * driver the passed handle was constructed with (pglite or postgres-js), chosen
 * dynamically so this file imports neither driver's runtime eagerly.
 *
 * Disable with `SKIP_MIGRATIONS=true` (matching backend's convention).
 */
export const runAdminMigrations = async (db: AdminDb): Promise<void> => {
  if (process.env.SKIP_MIGRATIONS === 'true') {
    return
  }
  const migrationsFolder = getAdminMigrationsFolder()
  const config = { migrationsFolder, migrationsTable: adminMigrationsTable }

  if (process.env.DATABASE_DRIVER === 'pglite') {
    const { migrate } = await import('drizzle-orm/pglite/migrator')
    // The concrete pglite database satisfies AdminDb; the migrator's parameter
    // type is the same driver instance the caller constructed.
    await migrate(db as never, config)
    return
  }

  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  await migrate(db as never, config)
}
