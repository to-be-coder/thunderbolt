/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import type { AnyDrizzleDatabase } from '../db/database-interface'
import { chatMessagesTable, chatThreadsTable } from '../db/tables'
import { clearNullableColumns, nowIso } from '../lib/utils'
import { type ChatThread, type Model } from '@/types'
import { builtInAgent } from '../defaults/agents'
import { getModel } from './models'
import type { DrizzleQueryWithPromise } from '@/types'

/** The three agent kinds a thread can reference (PRD Rev 3.2). */
export type AgentKind = 'thunderbolt' | 'personal' | 'team'

/** Discriminated agentRef pair stored on a thread as (agent_kind, agent_id).
 *  The built-in Thunderbolt agent is not a row anywhere, so its ref carries
 *  no id; personal/team refs point at a personal agent row / cached team card. */
export type AgentRef =
  | { kind: 'thunderbolt'; agentId: null }
  | { kind: 'personal'; agentId: string }
  | { kind: 'team'; agentId: string }

/** Thrown when an update tries to change a thread's agentRef after the thread
 *  already has at least one message — the agent a conversation happened with
 *  is part of the conversation's identity and cannot be rewritten. */
export class AgentRefImmutableError extends Error {
  constructor(public readonly threadId: string) {
    super(`Thread "${threadId}" already has messages; its agent can no longer be changed.`)
    this.name = 'AgentRefImmutableError'
  }
}

/** Resolve a thread row's (agentKind, agentId) pair into the {@link AgentRef}
 *  union. NULL kind (rows written before the agent_kind column existed) reads
 *  as 'thunderbolt' — the backend migration backfills the same way. A kind
 *  that requires an id but has none degrades to the built-in ref. */
export const getAgentRef = (thread: Pick<ChatThread, 'agentKind' | 'agentId'>): AgentRef => {
  const kind = thread.agentKind ?? 'thunderbolt'
  if (kind === 'thunderbolt' || thread.agentId === null) {
    return { kind: 'thunderbolt', agentId: null }
  }
  return { kind, agentId: thread.agentId }
}

/** Derive the agentRef pair for a legacy `agentId` value (what the chat layer
 *  passes around today): the built-in agent's fixed id or null map to the
 *  'thunderbolt' ref; any other id is a personal/system agent reference. Team
 *  refs are never derived — Stage 2 selection passes them explicitly. */
export const agentRefForAgentId = (agentId: string | null | undefined): AgentRef => {
  if (!agentId || agentId === builtInAgent.id) {
    return { kind: 'thunderbolt', agentId: null }
  }
  return { kind: 'personal', agentId }
}

/**
 * Checks if a chat thread ID exists as a soft-deleted record.
 * Used to detect when a user visits a URL for a deleted chat.
 */
export const isChatThreadDeleted = async (db: AnyDrizzleDatabase, id: string): Promise<boolean> => {
  const thread = await db
    .select({ id: chatThreadsTable.id })
    .from(chatThreadsTable)
    .where(and(eq(chatThreadsTable.id, id), isNotNull(chatThreadsTable.deletedAt)))
    .get()
  return thread !== undefined
}

/**
 * Gets all chat threads, ordered by creation date (excluding soft-deleted).
 */
export const getAllChatThreads = (db: AnyDrizzleDatabase) => {
  const query = db
    .select()
    .from(chatThreadsTable)
    .where(isNull(chatThreadsTable.deletedAt))
    .orderBy(desc(chatThreadsTable.id))
  return query as typeof query & DrizzleQueryWithPromise<ChatThread>
}

/**
 * Gets a specific chat thread by ID (excluding soft-deleted)
 */
export const getChatThread = async (db: AnyDrizzleDatabase, id: string): Promise<ChatThread | null> => {
  const thread = await db
    .select()
    .from(chatThreadsTable)
    .where(and(eq(chatThreadsTable.id, id), isNull(chatThreadsTable.deletedAt)))
    .get()
  return (thread ?? null) as ChatThread | null
}

/**
 * Create a new chat thread.
 *
 * @param model - Resolved model (caller must fetch via getModel);
 *
 * `agentId` is optional on creation so the first message can persist the
 * user's currently-selected agent atomically. Without this, new threads were
 * created with `agentId: null` and a reload would fall back to the built-in
 * default — losing the user's selection.
 *
 * The agentRef pair is completed here: `agentKind` defaults to the kind
 * derived from `agentId` (built-in/null → 'thunderbolt', anything else →
 * 'personal'); pass it explicitly to reference a team agent.
 */
export const createChatThread = async (
  db: AnyDrizzleDatabase,
  data: Pick<ChatThread, 'contextSize' | 'id' | 'title' | 'triggeredBy' | 'wasTriggeredByAutomation'> & {
    agentId?: string | null
    agentKind?: AgentKind
  },
  model: Model,
): Promise<void> => {
  await db.insert(chatThreadsTable).values({
    ...data,
    agentKind: data.agentKind ?? agentRefForAgentId(data.agentId).kind,
    isEncrypted: model.isConfidential,
  })
}

/** True when the thread has at least one (non-deleted) message. Cheap LIMIT 1
 *  existence probe — inlined here (rather than importing from chat-messages)
 *  to keep the chat-messages → chat-threads import one-directional. */
const threadHasMessages = async (db: AnyDrizzleDatabase, threadId: string): Promise<boolean> => {
  const row = await db
    .select({ id: chatMessagesTable.id })
    .from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.chatThreadId, threadId), isNull(chatMessagesTable.deletedAt)))
    .limit(1)
    .get()
  return row !== undefined
}

/**
 * Update a chat thread.
 *
 * `acpSessionId` is included so the chat layer (`src/chats/chat-instance.ts`)
 * can persist the ACP `sessionId` returned by `session/new` for non-built-in
 * agents — future loads call `session/load` when the agent advertises it.
 *
 * The agentRef pair (`agentKind`/`agentId`) is immutable once the thread has
 * at least one message — such patches throw {@link AgentRefImmutableError}.
 */
export const updateChatThread = async (
  db: AnyDrizzleDatabase,
  id: string,
  data: Partial<
    Pick<
      ChatThread,
      | 'acpSessionId'
      | 'agentId'
      | 'agentKind'
      | 'contextSize'
      | 'modeId'
      | 'title'
      | 'triggeredBy'
      | 'wasTriggeredByAutomation'
    >
  >,
): Promise<void> => {
  const touchesAgentRef = 'agentId' in data || 'agentKind' in data
  if (touchesAgentRef && (await threadHasMessages(db, id))) {
    throw new AgentRefImmutableError(id)
  }
  await db.update(chatThreadsTable).set(data).where(eq(chatThreadsTable.id, id))
}

/**
 * Gets a specific chat thread by ID or creates a new one with the provided ID.
 *
 * Pass `agentId` so the thread row stores the user's currently-selected agent
 * on creation. Pass `agentKind` to complete the agentRef pair — required for
 * TEAM agents, which have no `Agent` row for `agentRefForAgentId` to map from
 * (a team card id would otherwise default to the 'personal' kind and the thread
 * would resolve to a revoked descriptor on reload). Existing threads are
 * returned untouched — caller is responsible for any subsequent updates via
 * `updateChatThread`.
 */
export const getOrCreateChatThread = async (
  db: AnyDrizzleDatabase,
  id: string,
  modelId: string,
  agentId: string | null = null,
  agentKind?: AgentKind,
): Promise<ChatThread> => {
  const thread = await getChatThread(db, id)

  if (thread?.id) {
    return thread
  }

  const model = await getModel(db, modelId)
  if (!model) {
    throw new Error('No model found')
  }

  await createChatThread(
    db,
    {
      id,
      title: 'New Chat',
      contextSize: null,
      triggeredBy: null,
      wasTriggeredByAutomation: 0,
      agentId,
      agentKind,
    },
    model,
  )

  return (await getChatThread(db, id))! // We know the thread exists because we just created it
}

/**
 * Gets the context size for a chat thread (excluding soft-deleted).
 * @returns The context size in tokens, or null if not found/not known
 */
export const getContextSizeForThread = (db: AnyDrizzleDatabase, threadId: string) => {
  const query = db
    .select({ contextSize: chatThreadsTable.contextSize })
    .from(chatThreadsTable)
    .where(and(eq(chatThreadsTable.id, threadId), isNull(chatThreadsTable.deletedAt)))
  return query as typeof query & DrizzleQueryWithPromise<{ contextSize: number | null }>
}

/**
 * Soft deletes a specific chat thread by ID. Also soft-deletes all associated
 * messages that haven't been deleted yet. Scrubs all nullable columns for privacy.
 */
export const deleteChatThread = async (db: AnyDrizzleDatabase, id: string): Promise<void> => {
  const deletedAt = nowIso()
  await db.transaction(async (tx) => {
    await tx
      .update(chatMessagesTable)
      .set({ ...clearNullableColumns(chatMessagesTable), deletedAt })
      .where(and(eq(chatMessagesTable.chatThreadId, id), isNull(chatMessagesTable.deletedAt)))
    await tx
      .update(chatThreadsTable)
      .set({ ...clearNullableColumns(chatThreadsTable), deletedAt })
      .where(and(eq(chatThreadsTable.id, id), isNull(chatThreadsTable.deletedAt)))
  })
}

/**
 * Soft deletes all chat threads. Also soft-deletes all associated messages.
 * Scrubs all nullable columns for privacy. Only updates records that haven't
 * been deleted yet to preserve original deletion datetimes.
 */
export const deleteAllChatThreads = async (db: AnyDrizzleDatabase): Promise<void> => {
  const deletedAt = nowIso()
  await db.transaction(async (tx) => {
    await tx
      .update(chatMessagesTable)
      .set({ ...clearNullableColumns(chatMessagesTable), deletedAt })
      .where(isNull(chatMessagesTable.deletedAt))
    await tx
      .update(chatThreadsTable)
      .set({ ...clearNullableColumns(chatThreadsTable), deletedAt })
      .where(isNull(chatThreadsTable.deletedAt))
  })
}
