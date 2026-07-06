/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Admin-plane schema — server-side org configuration.
 *
 * These tables are NEVER PowerSync-synced (they are not in
 * `shared/powersync-tables.ts` or `config.yaml`). They live in the same
 * physical Postgres database as backend's tables but are owned by the
 * admin-service package and migrated via its own journal (`__admin_migrations`).
 *
 * Soft deletes (`deletedAt`) are used for members, groups, team_agents and
 * grants — the org's editable config. `group_members` and `audit_events` are
 * hard rows (join edges / append-only log).
 */

import { sql, type Column } from 'drizzle-orm'
import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

/** `IS NULL` predicate for a column — used by partial unique indexes so that
 *  soft-deleted rows are excluded from uniqueness. */
const sqlIsNull = (column: Column) => sql`${column} is null`

/** A person in the org. Created `invited` by an admin; flips to `active` on
 *  first successful sign-in (see `activation.ts`). Matched to Better Auth by
 *  normalized email — there is no FK to the `user` table because a member row
 *  exists before the user ever signs in. */
export const members = pgTable(
  'members',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    status: text('status', { enum: ['invited', 'active'] })
      .notNull()
      .default('invited'),
    isAdmin: boolean('is_admin').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Only one live member row per email; soft-deleted rows don't collide.
    uniqueIndex('members_email_active_idx')
      .on(table.email)
      .where(sqlIsNull(table.deletedAt)),
    index('members_status_idx').on(table.status),
  ],
)

/** A named group members can belong to. The "everyone" group is implicit — it
 *  is a grant `target = 'everyone'`, not a row here. */
export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

/** Membership edge between a member and a group. */
export const groupMembers = pgTable(
  'group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('group_members_edge_idx').on(table.groupId, table.memberId),
    index('group_members_member_idx').on(table.memberId),
  ],
)

/** A registered team (company) agent. The card served to members is built ONLY
 *  from the display-safe columns here + `agentCapabilities` — INVARIANT 2. */
export const teamAgents = pgTable(
  'team_agents',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    icon: text('icon').notNull().default(''),
    description: text('description').notNull().default(''),
    acpUrl: text('acp_url').notNull(),
    category: text('category', { enum: ['sealed', 'extensible'] }).notNull(),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    managedBy: text('managed_by').notNull().default(''),
    /** Model NAMES the agent advertises — display copy only (never model configs). */
    advertisedModels: jsonb('advertised_models').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [index('team_agents_status_idx').on(table.status)],
)

/** One admin-authored, plain-language capability line for an agent. `label` is
 *  display copy — NEVER a skill name or executable identifier (INVARIANT 2). */
export const agentCapabilities = pgTable(
  'agent_capabilities',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => teamAgents.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    /** Whose credentials the capability runs under. `as_you` is aspirational at
     *  the transport layer today — see the ACP-identity note in `discovery/routes.ts`. */
    credentialMode: text('credential_mode', { enum: ['as_you', 'service_account'] }),
    position: text('position').notNull().default('0'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [index('agent_capabilities_agent_idx').on(table.agentId)],
)

/** A grant makes an agent visible to a target: a group, everyone, or an
 *  individual member (recorded as an audit exception). */
export const grants = pgTable(
  'grants',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => teamAgents.id, { onDelete: 'cascade' }),
    targetType: text('target_type', { enum: ['group', 'everyone', 'member'] }).notNull(),
    /** `groups.id` for group grants, `members.id` for member exceptions, NULL for everyone. */
    targetId: text('target_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [index('grants_agent_idx').on(table.agentId), index('grants_target_idx').on(table.targetType, table.targetId)],
)

/** Single-row org policy delivered in the discovery envelope. Enforced to one
 *  row via a fixed primary key (`orgPolicyRowId`). */
export const orgPolicy = pgTable('org_policy', {
  id: text('id').primaryKey(),
  personalAgentPolicy: text('personal_agent_policy', { enum: ['all', 'no_native', 'company_only'] })
    .notNull()
    .default('all'),
  userModelsAllowed: boolean('user_models_allowed').notNull().default(true),
  // P0-8: user-added MCP policy — allowlist is the launch default for an org.
  mcpPolicy: text('mcp_policy', { enum: ['allow', 'allowlist', 'block'] })
    .notNull()
    .default('allowlist'),
  mcpAllowlist: jsonb('mcp_allowlist').$type<string[]>().notNull().default([]),
  // Built-in extension ids blocked org-wide (empty = all allowed).
  blockedExtensions: jsonb('blocked_extensions').$type<string[]>().notNull().default([]),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

/** Append-only audit trail. A row is written for EVERY admin-plane mutation. */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    target: text('target').notNull(),
    diff: jsonb('diff').$type<Record<string, unknown>>().notNull().default({}),
    ts: timestamp('ts').defaultNow().notNull(),
  },
  (table) => [index('audit_events_ts_idx').on(table.ts), index('audit_events_action_idx').on(table.action)],
)
