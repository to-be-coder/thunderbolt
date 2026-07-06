-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.

-- Stage 1 of the agent-access model (PRD Rev 3.2):
--   * `agents` becomes personal-ACP-only: {id, name, acp_url, created_at}
--     (+ deleted_at / user_id). Instruction-adjacent columns (type, transport,
--     description, icon, enabled) are dropped; `url` data moves to `acp_url`.
--   * `chat_threads` gains the agentRef pair's `agent_kind` column
--     ('thunderbolt' | 'personal' | 'team'); existing threads backfill to
--     'thunderbolt' (the built-in agent, which is never a DB row).
--
-- HAND-EDITED after `bun db generate`:
--   * `acp_url` is added NULLABLE first, backfilled from the old `url`
--     column, then SET NOT NULL — the generated `ADD COLUMN ... NOT NULL`
--     would fail on any deployment with existing agent rows.
--   * Data-repair UPDATEs added (drizzle cannot generate them). All DML runs
--     while the tables' PKs are intact, satisfying the logical-replication
--     REPLICA IDENTITY constraint 0021/0022 document.
--   * Column drops run AFTER the DML that reads them.

ALTER TABLE "powersync"."agents" ADD COLUMN "acp_url" text;--> statement-breakpoint
ALTER TABLE "powersync"."agents" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "powersync"."chat_threads" ADD COLUMN "agent_kind" text DEFAULT 'thunderbolt';--> statement-breakpoint

-- Backfill: carry the old endpoint into the new column, then enforce NOT NULL.
UPDATE "powersync"."agents" SET "acp_url" = "url" WHERE "acp_url" IS NULL;--> statement-breakpoint
ALTER TABLE "powersync"."agents" ALTER COLUMN "acp_url" SET NOT NULL;--> statement-breakpoint

-- Backfill: every pre-agent_kind thread belongs to the built-in Thunderbolt
-- agent. ADD COLUMN ... DEFAULT already stamps existing rows; this catches any
-- row that somehow carries an explicit NULL.
UPDATE "powersync"."chat_threads" SET "agent_kind" = 'thunderbolt' WHERE "agent_kind" IS NULL;--> statement-breakpoint

ALTER TABLE "powersync"."agents" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "powersync"."agents" DROP COLUMN "transport";--> statement-breakpoint
ALTER TABLE "powersync"."agents" DROP COLUMN "url";--> statement-breakpoint
ALTER TABLE "powersync"."agents" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "powersync"."agents" DROP COLUMN "icon";--> statement-breakpoint
ALTER TABLE "powersync"."agents" DROP COLUMN "enabled";
