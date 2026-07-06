/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { and, desc, eq, getTableColumns, isNotNull, isNull, or, sql } from 'drizzle-orm'
import type { AnyDrizzleDatabase } from '../db/database-interface'
import { modelsTable, settingsTable } from '../db/tables'
import { hashModel } from '../defaults/models'
import { clearNullableColumns, nowIso } from '../lib/utils'
import type { DrizzleQueryWithPromise, Model } from '@/types'
import { getLastMessage } from './chat-messages'
import { createDefaultModelProfile, deleteModelProfileForModel } from './model-profiles'
import { assertByoModelAllowed } from './model-policy'
import { getOrgPolicy } from './org-policy'

/**
 * Gets all models (excluding soft-deleted), sorted with system models first,
 * then alphabetically by name.
 */
export const getAllModels = (db: AnyDrizzleDatabase) => {
  const query = db
    .select()
    .from(modelsTable)
    .where(isNull(modelsTable.deletedAt))
    .orderBy(desc(modelsTable.isSystem), modelsTable.name)

  return query as typeof query & DrizzleQueryWithPromise<Model>
}

/**
 * Gets all available (enabled) models (excluding soft-deleted), sorted with
 * system models first, then alphabetically by name.
 */
export const getAvailableModels = (db: AnyDrizzleDatabase) => {
  const query = db
    .select()
    .from(modelsTable)
    .where(and(eq(modelsTable.enabled, 1), isNull(modelsTable.deletedAt)))
    .orderBy(desc(modelsTable.isSystem), modelsTable.name)

  return query as typeof query & DrizzleQueryWithPromise<Model>
}

export const getModelQuery = (db: AnyDrizzleDatabase, id: string) => {
  const query = db
    .select()
    .from(modelsTable)
    .where(and(eq(modelsTable.id, id), isNull(modelsTable.deletedAt)))

  return query as typeof query & DrizzleQueryWithPromise<Model>
}

/**
 * Returns a Drizzle query for the currently selected model, falling back to
 * the system model. Use with PowerSync's toCompilableQuery, or await the
 * result to execute. Returns the selected model if it exists and is enabled;
 * otherwise the system model.
 */
export const getSelectedModelQuery = (db: AnyDrizzleDatabase) => {
  // Explicit column projection — without it Drizzle nests joined rows as
  // `{ models: …, settings: … }` and downstream `as Model` casts break.
  const query = db
    .select(getTableColumns(modelsTable))
    .from(modelsTable)
    .leftJoin(
      settingsTable,
      and(eq(settingsTable.key, 'selected_model'), eq(settingsTable.value, modelsTable.id), eq(modelsTable.enabled, 1)),
    )
    .where(and(isNull(modelsTable.deletedAt), or(eq(modelsTable.isSystem, 1), isNotNull(settingsTable.value))))
    .orderBy(sql`CASE WHEN ${settingsTable.value} IS NOT NULL THEN 0 ELSE 1 END`, modelsTable.name)
    .limit(1)

  return query as typeof query & DrizzleQueryWithPromise<Model>
}

/**
 * Gets a specific model by ID (excluding soft-deleted)
 */
export const getModel = async (db: AnyDrizzleDatabase, id: string): Promise<Model | null> => {
  const model = await getModelQuery(db, id).get()
  return model ? (model as Model) : null
}

export const getSystemModel = async (db: AnyDrizzleDatabase): Promise<Model | null> => {
  const systemModel = await db
    .select()
    .from(modelsTable)
    .where(and(eq(modelsTable.isSystem, 1), isNull(modelsTable.deletedAt)))
    .orderBy(modelsTable.name)
    .get()
  return systemModel ? (systemModel as Model) : null
}

/**
 * Gets the currently selected model or falls back to the system default model.
 * If the selected model is disabled, falls back.
 */
export const getSelectedModel = async (db: AnyDrizzleDatabase): Promise<Model> => {
  const result = await getSelectedModelQuery(db).all()
  const row = result[0]
  if (!row) {
    throw new Error('No system model found')
  }
  return row as Model
}

/**
 * Gets the default model for a chat thread based on the last message in the thread,
 * falling back to the selected_model setting then the system model.
 * If any fallback model is disabled, continues to the next fallback option.
 */
export const getDefaultModelForThread = async (
  db: AnyDrizzleDatabase,
  threadId: string,
  fallbackModelId?: string,
): Promise<Model> => {
  const lastMessage = await getLastMessage(db, threadId)

  if (lastMessage?.modelId) {
    const model = await getModel(db, lastMessage.modelId)

    if (model && model.enabled) {
      return model
    }
  }

  if (fallbackModelId) {
    const model = await getModel(db, fallbackModelId)

    if (model && model.enabled) {
      return model
    }
  }

  return await getSelectedModel(db)
}

/**
 * Update a model (preserves defaultHash for modification tracking)
 */
export const updateModel = async (db: AnyDrizzleDatabase, id: string, updates: Partial<Model>): Promise<void> => {
  // Strip `defaultHash` — preserved for modification tracking.
  const { defaultHash, ...updateFields } = updates as Partial<Model> & { defaultHash?: string }

  if (Object.keys(updateFields).length === 0) {
    return
  }
  await db.update(modelsTable).set(updateFields).where(eq(modelsTable.id, id))
}

/**
 * Reset a model to its default state. Recomputes `defaultHash` so that any
 * legacy/stale value left over from a previous `hashModel` formula is replaced
 * with the current one — otherwise `isModelModified` would keep flagging the
 * row as modified even right after a reset. `userId` is stripped from the
 * default template so we never overwrite the row's real owner with `null`
 * (which would surface as an empty PATCH and a 400 from the upload handler).
 */
export const resetModelToDefault = async (db: AnyDrizzleDatabase, id: string, defaultModel: Model): Promise<void> => {
  const { defaultHash, userId, ...defaultFields } = defaultModel
  await db
    .update(modelsTable)
    .set({ ...defaultFields, defaultHash: hashModel(defaultModel) })
    .where(eq(modelsTable.id, id))
}

/**
 * Soft deletes a model by ID (sets deletedAt datetime). Also soft-deletes all
 * prompts referencing this model (and their triggers). Scrubs all non-enum
 * data for privacy. Only updates records that haven't been deleted yet to
 * preserve original deletion datetimes.
 */
export const deleteModel = async (db: AnyDrizzleDatabase, id: string): Promise<void> => {
  // Dynamic import to avoid circular dependency: models -> prompts -> models (via getModel)
  const { deletePromptsForModel } = await import('./prompts')
  await db.transaction(async (tx) => {
    await deleteModelProfileForModel(tx, id)
    await deletePromptsForModel(tx, id)
    await tx
      .update(modelsTable)
      .set({ ...clearNullableColumns(modelsTable), deletedAt: nowIso() })
      .where(and(eq(modelsTable.id, id), isNull(modelsTable.deletedAt)))
  })
}

/**
 * Creates a new model.
 */
export const createModel = async (
  db: AnyDrizzleDatabase,
  data: Partial<Model> & Pick<Model, 'id' | 'provider' | 'name' | 'model'>,
): Promise<void> => {
  // T4 — BYO models are gated by org policy. Company-supplied (`isSystem === 1`)
  // models are always allowed; a user-added model is refused when the org has
  // disabled BYO. Consumer/no-org mode defaults to allowed.
  assertByoModelAllowed(await getOrgPolicy(db), { isSystem: data.isSystem ?? 0 })
  await db.transaction(async (tx) => {
    await tx.insert(modelsTable).values(data)
    await createDefaultModelProfile(tx, data.id)
  })
}
