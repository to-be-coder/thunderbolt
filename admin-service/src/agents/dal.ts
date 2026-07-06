/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { AdminDb } from '../db/types'
import { agentCapabilities, teamAgents } from '../db/schema'

export type TeamAgent = typeof teamAgents.$inferSelect
export type AgentCapability = typeof agentCapabilities.$inferSelect

export type CapabilityInput = { label: string; credentialMode?: 'as_you' | 'service_account' }

export const listLiveAgents = async (db: AdminDb): Promise<TeamAgent[]> =>
  db.select().from(teamAgents).where(isNull(teamAgents.deletedAt))

export const getLiveAgentById = async (db: AdminDb, id: string): Promise<TeamAgent | null> =>
  db
    .select()
    .from(teamAgents)
    .where(and(eq(teamAgents.id, id), isNull(teamAgents.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null)

/** Live capability rows for a set of agents, ordered by their `position`. */
export const getCapabilitiesForAgents = async (db: AdminDb, agentIds: string[]): Promise<AgentCapability[]> => {
  if (agentIds.length === 0) {
    return []
  }
  return db
    .select()
    .from(agentCapabilities)
    .where(and(inArray(agentCapabilities.agentId, agentIds), isNull(agentCapabilities.deletedAt)))
}

/** Replace an agent's capability rows (soft-delete old, insert new) in-place.
 *  Call within a transaction alongside the agent mutation. */
export const replaceCapabilities = async (db: AdminDb, agentId: string, capabilities: CapabilityInput[]): Promise<void> => {
  await db
    .update(agentCapabilities)
    .set({ deletedAt: new Date() })
    .where(and(eq(agentCapabilities.agentId, agentId), isNull(agentCapabilities.deletedAt)))
  if (capabilities.length === 0) {
    return
  }
  await db.insert(agentCapabilities).values(
    capabilities.map((cap, index) => ({
      id: crypto.randomUUID(),
      agentId,
      label: cap.label,
      credentialMode: cap.credentialMode ?? null,
      position: String(index),
    })),
  )
}

export type InsertAgentInput = {
  name: string
  icon?: string
  description?: string
  acpUrl: string
  category: 'sealed' | 'extensible'
  status?: 'draft' | 'published'
  managedBy?: string
  advertisedModels?: string[]
  capabilities?: CapabilityInput[]
}

export const insertAgent = async (db: AdminDb, input: InsertAgentInput): Promise<TeamAgent> => {
  const created = await db
    .insert(teamAgents)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      icon: input.icon ?? '',
      description: input.description ?? '',
      acpUrl: input.acpUrl,
      category: input.category,
      status: input.status ?? 'draft',
      managedBy: input.managedBy ?? '',
      advertisedModels: input.advertisedModels ?? [],
    })
    .returning()
    .then((rows) => rows[0])
  await replaceCapabilities(db, created.id, input.capabilities ?? [])
  return created
}

export type PatchAgentInput = Partial<Omit<InsertAgentInput, 'capabilities'>> & { capabilities?: CapabilityInput[] }

export const updateAgent = async (db: AdminDb, id: string, patch: PatchAgentInput): Promise<TeamAgent | null> => {
  const fields: Partial<typeof teamAgents.$inferInsert> = {}
  if (patch.name !== undefined) fields.name = patch.name
  if (patch.icon !== undefined) fields.icon = patch.icon
  if (patch.description !== undefined) fields.description = patch.description
  if (patch.acpUrl !== undefined) fields.acpUrl = patch.acpUrl
  if (patch.category !== undefined) fields.category = patch.category
  if (patch.status !== undefined) fields.status = patch.status
  if (patch.managedBy !== undefined) fields.managedBy = patch.managedBy
  if (patch.advertisedModels !== undefined) fields.advertisedModels = patch.advertisedModels

  const updated =
    Object.keys(fields).length > 0
      ? await db
          .update(teamAgents)
          .set(fields)
          .where(and(eq(teamAgents.id, id), isNull(teamAgents.deletedAt)))
          .returning()
          .then((rows) => rows[0] ?? null)
      : await getLiveAgentById(db, id)

  if (updated && patch.capabilities !== undefined) {
    await replaceCapabilities(db, id, patch.capabilities)
  }
  return updated
}

export const softDeleteAgent = async (db: AdminDb, id: string): Promise<void> => {
  await db.update(teamAgents).set({ deletedAt: new Date() }).where(eq(teamAgents.id, id))
}
