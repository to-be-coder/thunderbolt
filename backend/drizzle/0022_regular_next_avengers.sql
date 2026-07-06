-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.

-- Workspaces removal (inverse of 0021): every row goes back to being
-- user-scoped. Resource tables revert to (id, user_id) composite PKs and
-- user_id NOT NULL + ON DELETE cascade; the four workspace tables and the
-- workspace_id/scope columns are dropped.
--
-- HAND-EDITED after `bun db generate`:
--   * Statements are reordered so all DML (the data-repair DELETEs below) runs
--     while the (id, workspace_id) composite PKs still exist — the powersync.*
--     tables are published for logical replication and Postgres refuses
--     UPDATE/DELETE on a published table without a REPLICA IDENTITY (same
--     ordering constraint 0021 documents). The FK drops on the data tables
--     also had to move BEFORE the DROP TABLE ... CASCADE statements, which
--     would otherwise have removed those constraints first and made the
--     explicit drops fail.
--   * Data-repair steps (NULL-user_id cleanup + (id, user_id) dedupe) were
--     added — drizzle cannot generate them.
--   * A spurious `devices ADD COLUMN app_version` was removed: 0021's snapshot
--     was missing the column 0020 added, so the diff tried to re-add it. The
--     0022 snapshot includes it, which re-syncs snapshot history with the DB.

-- ── Phase 1: data repair (runs while the old composite PKs still exist) ──

-- Resource rows with NULL user_id (author deleted their account while the row
-- survived in a shared workspace) have no owner in a user-scoped world: delete.
DELETE FROM "powersync"."agents"         WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "powersync"."model_profiles" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "powersync"."models"         WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "powersync"."modes"          WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "powersync"."prompts"        WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "powersync"."skills"         WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "powersync"."triggers"       WHERE "user_id" IS NULL;--> statement-breakpoint

-- Dedupe rows sharing (id, user_id) before that pair becomes the PK. Seeded
-- default rows repeat fixed ids once per workspace (0021's design), so a user
-- in N workspaces has N copies. Keep the personal-workspace copy —
-- workspace_id = uuid_generate_v5(NS, 'personal:' || user_id), the same
-- derivation as shared computePersonalWorkspaceId — falling back to the lowest
-- workspace_id when no personal copy exists; delete the rest.
DELETE FROM "powersync"."agents" t USING (
  SELECT ctid, row_number() OVER (
    PARTITION BY "id", "user_id"
    ORDER BY ("workspace_id" = uuid_generate_v5('e2c4f9e0-b3a1-4a5c-9e8f-1d3a5c7e9f1b'::uuid, 'personal:' || "user_id")::text) DESC, "workspace_id"
  ) AS rn FROM "powersync"."agents"
) ranked WHERE t.ctid = ranked.ctid AND ranked.rn > 1;--> statement-breakpoint
DELETE FROM "powersync"."model_profiles" t USING (
  SELECT ctid, row_number() OVER (
    PARTITION BY "id", "user_id"
    ORDER BY ("workspace_id" = uuid_generate_v5('e2c4f9e0-b3a1-4a5c-9e8f-1d3a5c7e9f1b'::uuid, 'personal:' || "user_id")::text) DESC, "workspace_id"
  ) AS rn FROM "powersync"."model_profiles"
) ranked WHERE t.ctid = ranked.ctid AND ranked.rn > 1;--> statement-breakpoint
DELETE FROM "powersync"."models" t USING (
  SELECT ctid, row_number() OVER (
    PARTITION BY "id", "user_id"
    ORDER BY ("workspace_id" = uuid_generate_v5('e2c4f9e0-b3a1-4a5c-9e8f-1d3a5c7e9f1b'::uuid, 'personal:' || "user_id")::text) DESC, "workspace_id"
  ) AS rn FROM "powersync"."models"
) ranked WHERE t.ctid = ranked.ctid AND ranked.rn > 1;--> statement-breakpoint
DELETE FROM "powersync"."modes" t USING (
  SELECT ctid, row_number() OVER (
    PARTITION BY "id", "user_id"
    ORDER BY ("workspace_id" = uuid_generate_v5('e2c4f9e0-b3a1-4a5c-9e8f-1d3a5c7e9f1b'::uuid, 'personal:' || "user_id")::text) DESC, "workspace_id"
  ) AS rn FROM "powersync"."modes"
) ranked WHERE t.ctid = ranked.ctid AND ranked.rn > 1;--> statement-breakpoint
DELETE FROM "powersync"."prompts" t USING (
  SELECT ctid, row_number() OVER (
    PARTITION BY "id", "user_id"
    ORDER BY ("workspace_id" = uuid_generate_v5('e2c4f9e0-b3a1-4a5c-9e8f-1d3a5c7e9f1b'::uuid, 'personal:' || "user_id")::text) DESC, "workspace_id"
  ) AS rn FROM "powersync"."prompts"
) ranked WHERE t.ctid = ranked.ctid AND ranked.rn > 1;--> statement-breakpoint
DELETE FROM "powersync"."skills" t USING (
  SELECT ctid, row_number() OVER (
    PARTITION BY "id", "user_id"
    ORDER BY ("workspace_id" = uuid_generate_v5('e2c4f9e0-b3a1-4a5c-9e8f-1d3a5c7e9f1b'::uuid, 'personal:' || "user_id")::text) DESC, "workspace_id"
  ) AS rn FROM "powersync"."skills"
) ranked WHERE t.ctid = ranked.ctid AND ranked.rn > 1;--> statement-breakpoint
DELETE FROM "powersync"."tasks" t USING (
  SELECT ctid, row_number() OVER (
    PARTITION BY "id", "user_id"
    ORDER BY ("workspace_id" = uuid_generate_v5('e2c4f9e0-b3a1-4a5c-9e8f-1d3a5c7e9f1b'::uuid, 'personal:' || "user_id")::text) DESC, "workspace_id"
  ) AS rn FROM "powersync"."tasks"
) ranked WHERE t.ctid = ranked.ctid AND ranked.rn > 1;--> statement-breakpoint

-- ── Phase 2: drop FKs + indexes tied to workspace_id (DDL only from here) ──

ALTER TABLE "powersync"."agents" DROP CONSTRAINT "agents_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."agents" DROP CONSTRAINT "agents_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."chat_messages" DROP CONSTRAINT "chat_messages_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."chat_threads" DROP CONSTRAINT "chat_threads_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."model_profiles" DROP CONSTRAINT "model_profiles_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."model_profiles" DROP CONSTRAINT "model_profiles_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."models" DROP CONSTRAINT "models_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."models" DROP CONSTRAINT "models_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."modes" DROP CONSTRAINT "modes_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."modes" DROP CONSTRAINT "modes_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."prompts" DROP CONSTRAINT "prompts_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."prompts" DROP CONSTRAINT "prompts_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."skills" DROP CONSTRAINT "skills_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."skills" DROP CONSTRAINT "skills_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."tasks" DROP CONSTRAINT "tasks_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."triggers" DROP CONSTRAINT "triggers_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "powersync"."triggers" DROP CONSTRAINT "triggers_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "powersync"."idx_agents_workspace_id";--> statement-breakpoint
DROP INDEX "powersync"."idx_chat_messages_workspace_id";--> statement-breakpoint
DROP INDEX "powersync"."idx_chat_threads_workspace_id";--> statement-breakpoint
DROP INDEX "powersync"."idx_model_profiles_workspace_id";--> statement-breakpoint
DROP INDEX "powersync"."idx_models_workspace_id";--> statement-breakpoint
DROP INDEX "powersync"."idx_modes_workspace_id";--> statement-breakpoint
DROP INDEX "powersync"."idx_prompts_workspace_id";--> statement-breakpoint
DROP INDEX "powersync"."idx_skills_workspace_id";--> statement-breakpoint
DROP INDEX "powersync"."idx_tasks_workspace_id";--> statement-breakpoint
DROP INDEX "powersync"."idx_triggers_workspace_id";--> statement-breakpoint

-- ── Phase 3: swap PKs back to (id, user_id) and restore user_id NOT NULL ──

ALTER TABLE "powersync"."agents" DROP CONSTRAINT "agents_id_workspace_id_pk";--> statement-breakpoint
ALTER TABLE "powersync"."model_profiles" DROP CONSTRAINT "model_profiles_id_workspace_id_pk";--> statement-breakpoint
ALTER TABLE "powersync"."models" DROP CONSTRAINT "models_id_workspace_id_pk";--> statement-breakpoint
ALTER TABLE "powersync"."modes" DROP CONSTRAINT "modes_id_workspace_id_pk";--> statement-breakpoint
ALTER TABLE "powersync"."prompts" DROP CONSTRAINT "prompts_id_workspace_id_pk";--> statement-breakpoint
ALTER TABLE "powersync"."skills" DROP CONSTRAINT "skills_id_workspace_id_pk";--> statement-breakpoint
ALTER TABLE "powersync"."tasks" DROP CONSTRAINT "tasks_id_workspace_id_pk";--> statement-breakpoint
ALTER TABLE "powersync"."agents" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "powersync"."model_profiles" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "powersync"."models" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "powersync"."modes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "powersync"."prompts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "powersync"."skills" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "powersync"."triggers" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "powersync"."agents" ADD CONSTRAINT "agents_id_user_id_pk" PRIMARY KEY("id","user_id");--> statement-breakpoint
ALTER TABLE "powersync"."model_profiles" ADD CONSTRAINT "model_profiles_id_user_id_pk" PRIMARY KEY("id","user_id");--> statement-breakpoint
ALTER TABLE "powersync"."models" ADD CONSTRAINT "models_id_user_id_pk" PRIMARY KEY("id","user_id");--> statement-breakpoint
ALTER TABLE "powersync"."modes" ADD CONSTRAINT "modes_id_user_id_pk" PRIMARY KEY("id","user_id");--> statement-breakpoint
ALTER TABLE "powersync"."prompts" ADD CONSTRAINT "prompts_id_user_id_pk" PRIMARY KEY("id","user_id");--> statement-breakpoint
ALTER TABLE "powersync"."skills" ADD CONSTRAINT "skills_id_user_id_pk" PRIMARY KEY("id","user_id");--> statement-breakpoint
ALTER TABLE "powersync"."tasks" ADD CONSTRAINT "tasks_id_user_id_pk" PRIMARY KEY("id","user_id");--> statement-breakpoint
ALTER TABLE "powersync"."agents" ADD CONSTRAINT "agents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."model_profiles" ADD CONSTRAINT "model_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."models" ADD CONSTRAINT "models_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."modes" ADD CONSTRAINT "modes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."prompts" ADD CONSTRAINT "prompts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."skills" ADD CONSTRAINT "skills_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."triggers" ADD CONSTRAINT "triggers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- ── Phase 4: drop workspace_id / scope columns, then the workspace tables ──

ALTER TABLE "powersync"."agents" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."agents" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "powersync"."chat_messages" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."chat_threads" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."model_profiles" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."model_profiles" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "powersync"."models" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."models" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "powersync"."modes" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."modes" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "powersync"."prompts" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."prompts" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "powersync"."skills" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."skills" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "powersync"."tasks" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."triggers" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "powersync"."triggers" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "powersync"."workspace_memberships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "powersync"."workspace_pending_memberships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "powersync"."workspace_permissions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "powersync"."workspaces" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "powersync"."workspace_permissions" CASCADE;--> statement-breakpoint
DROP TABLE "powersync"."workspace_pending_memberships" CASCADE;--> statement-breakpoint
DROP TABLE "powersync"."workspace_memberships" CASCADE;--> statement-breakpoint
DROP TABLE "powersync"."workspaces" CASCADE;
