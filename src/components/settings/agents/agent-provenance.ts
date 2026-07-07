/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AgentCard } from '@shared/agent-cards'
import type { LibraryCounts } from '@/hooks/use-library-counts'

/**
 * Provenance copy (agents-page-spec §1). Every agent row's secondary line tells
 * the member where the agent came from AND predicts what tapping does. The
 * strings are exact spec copy — the row and the detail-header subtitle both
 * read them so the two never drift.
 */

/** Company (team) agent row sub-label — just the category. The org name is
 *  omitted: a member belongs to exactly one org, so "From {org}" is redundant. */
export const companyProvenanceLine = (card: Pick<AgentCard, 'category'>): string =>
  card.category === 'extensible' ? 'Extensible' : 'Sealed'

/** The Thunderbolt (native) agent's provenance line. */
export const nativeProvenanceLine = (): string => 'Your agent · uses your Library'

/** Extract the display host from a personal ACP endpoint URL, falling back to
 *  the raw string when it isn't a parseable URL (never throws in render). */
export const acpHost = (url: string | null): string => {
  if (!url) {
    return ''
  }
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** Personal ACP agent row provenance: `Connected agent · {host}`. The live
 *  status dot renders alongside it, not inside this string. */
export const personalProvenanceLine = (url: string | null): string => `Connected agent · ${acpHost(url)}`

/** Pluralize a count with its unit label ("1 skill" / "2 skills"). */
const pluralize = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`

/** The universal-Library summary line for the Thunderbolt "What it uses" block
 *  (agents-page-spec §2): `N skills · N MCP servers · N extensions`. */
export const formatLibrarySummary = (counts: LibraryCounts): string =>
  [
    pluralize(counts.skills, 'skill', 'skills'),
    pluralize(counts.mcpServers, 'MCP server', 'MCP servers'),
    pluralize(counts.extensions, 'extension', 'extensions'),
  ].join(' · ')
