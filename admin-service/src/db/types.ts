/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { TablesRelationalConfig } from 'drizzle-orm'
import type { PgQueryResultHKT, PgDatabase } from 'drizzle-orm/pg-core'

/**
 * The shared Drizzle handle the admin-service operates against. Typed to the
 * Postgres-dialect base class with WIDENED schema generics so backend's concrete
 * driver instances (postgres-js | pglite, each carrying the full backend schema)
 * are assignable here — as is a `PgTransaction` handed to `db.transaction`
 * callbacks. Cross-package table identity is safe because drizzle keys its
 * internals on global `Symbol.for("drizzle:*")`, shared across module copies.
 */
export type AdminDb = PgDatabase<PgQueryResultHKT, Record<string, unknown>, TablesRelationalConfig>
