/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getCurrentDatabase } from '@/db/database'
import type { AnyDrizzleDatabase } from '@/db/database-interface'
import { runDataMigrations } from '@/lib/data-migrations'
import { createHandleError } from '@/lib/error-utils'
import { trackError, trackEvent } from '@/lib/posthog'
import { reconcileDefaults } from '@/lib/reconcile-defaults'
import { findLegacyDbFilename, runLocalDbMigration } from '@/migrations/pre-workspaces-attach'
import { getActiveTrustDomain } from '@/stores/trust-domain-registry'
import { create } from 'zustand'

/**
 * Trigger context for the post-auth bootstrap. Either the user's id and
 * isAnonymous flag (server modes), or the standalone marker.
 */
export type BootstrapContext =
  | { kind: 'server'; userId: string; isAnonymous: boolean }
  | { kind: 'standalone'; userId: string }

/**
 * Module-level inflight promise. Concurrent callers — e.g. an OTP submit handler
 * awaiting the bootstrap while the `SessionBootstrap` observer also fires on the
 * same session change — share a single run instead of double-syncing,
 * double-reconciling, and double-migrating.
 */
let inflight: Promise<void> | null = null

type BootstrapReadinessStore = {
  bootstrapped: boolean
}

/**
 * Bootstrap-readiness barrier. Flips to `true` at the end of a successful
 * `runPostAuthBootstrap` run; the router's `BootstrapGate` holds the main-app
 * routes behind a loading screen until then, so DAL reads/writes never fire
 * against a database the pre-Workspaces migration and default reconciliation
 * haven't finished preparing.
 */
export const useBootstrapReadiness = create<BootstrapReadinessStore>()(() => ({ bootstrapped: false }))

/**
 * Post-auth pipeline. Once authentication (real or anonymous) is established,
 * this runs the pre-Workspaces local DB migration, reconciles default rows,
 * runs idempotent data migrations, and flips the bootstrap-readiness flag the
 * router gates on.
 *
 * Idempotent: safe to call multiple times. Subsequent calls during an in-flight
 * run return the same promise; calls after a completed run re-reconcile
 * defaults (no-op via defaultHash).
 *
 * Branches:
 *  - standalone → reconciles defaults and runs local data migrations.
 *  - real or anonymous server user → first migrates the legacy server-scoped
 *    database, then runs the same local preparation pipeline.
 *
 * The caller is expected to ensure the database is initialized and the trust
 * domain is set — both are guaranteed by `useAppInitialization` having completed.
 */
export const runPostAuthBootstrap = async (ctx: BootstrapContext): Promise<void> => {
  if (inflight) {
    return inflight
  }
  inflight = runBootstrapInternal(ctx).finally(() => {
    inflight = null
  })
  return inflight
}

const runBootstrapInternal = async (ctx: BootstrapContext): Promise<void> => {
  const database = getCurrentDatabase()
  if (!database?.isInitialized) {
    throw new Error('Post-auth bootstrap called before database initialization')
  }
  const db: AnyDrizzleDatabase = database.db

  const trustDomain = getActiveTrustDomain()
  if (!trustDomain) {
    throw new Error('Post-auth bootstrap called with no active trust domain')
  }

  // Pre-Workspaces v1 data migration — step 3. ATTACH the legacy
  // `thunderbolt-sync.db` onto the new `server-<id>.db` and copy rows across.
  //
  // ORDER IS LOAD-BEARING: this runs before the readiness flag flips because
  // `BootstrapGate` holds the routes until bootstrap completes. If routes
  // rendered against an empty DB before the migration backfilled it, chat URLs
  // would `navigate('/not-found')` from `use-hydrate-chat-store` and
  // `OnboardingDialog` would fire on the default
  // `user_has_completed_onboarding=false`.
  //
  // Server-only — standalone databases have no legacy server namespace to attach.
  if (ctx.kind === 'server' && trustDomain.kind === 'server') {
    try {
      const legacyDb = await findLegacyDbFilename()
      const dbMigration = await runLocalDbMigration({
        newDb: db,
        serverId: trustDomain.serverId,
        legacyDb,
      })
      if (dbMigration.ranMigration) {
        trackEvent('migration_db_completed', {
          duration_ms: Math.round(dbMigration.durationMs),
          rows_inserted: dbMigration.rowsInsertedByTable,
          model_api_keys_copied: dbMigration.modelApiKeysCopied,
          legacy_ps_crud_copied: dbMigration.legacyPsCrudCopied,
        })
      }
    } catch (error) {
      // Failure here leaves the completion flag unset → next boot retries.
      // Don't abort bootstrap: the user can still operate against the new
      // (empty) DB while we surface telemetry, and a retry has a good shot.
      console.error('Failed to run pre-Workspaces local DB migration:', error)
      trackError(
        createHandleError('PRE_WORKSPACES_LOCAL_DB_MIGRATION_FAILED', 'Failed to migrate local SQLite', error),
        { migration_step: 'local_db' },
      )
    }
  }

  await reconcileDefaults(db)

  // Data migrations sit AFTER reconcileDefaults so any newly-seeded defaults
  // (e.g. the daily-brief skill) are present when a migration checks for slug
  // collisions. The runner swallows per-migration failures so it never throws.
  await runDataMigrations(db)

  useBootstrapReadiness.setState({ bootstrapped: true })
}

/**
 * Resets the inflight bootstrap and the readiness flag so the next sign-in /
 * sign-up triggers a fresh run and the router re-gates until it completes.
 */
export const resetPostAuthBootstrap = (): void => {
  inflight = null
  useBootstrapReadiness.setState({ bootstrapped: false })
}
