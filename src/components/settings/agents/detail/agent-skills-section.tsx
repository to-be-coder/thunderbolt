/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Link } from 'react-router'
import { SEALED_SKILLS_MESSAGE } from '@/lib/agent-copy'
import { useEnabledSkills as useEnabledSkills_default } from '@/skills/use-skills'
import { DetailSection } from './agent-detail-layout'

type AgentSkillsProps = {
  /** COUNT of the agent's OWN bundled skills — a number only, never the names
   *  (count-only relaxation of INVARIANT 2). Hidden entirely when 0: an agent
   *  with no built-in skills (e.g. the native Thunderbolt agent) shows only the
   *  Library line. */
  agentSkillCount: number
  /** Whether the member's enabled Library skills reach this agent. `true` for
   *  extensible company agents, the Thunderbolt native agent, and personal ACP
   *  agents; `false` for sealed company agents (Library skills are blocked). */
  libraryAllowed: boolean
  /** Injectable for tests; production reads member-side enabled skills. */
  useEnabledSkills?: typeof useEnabledSkills_default
}

/**
 * The two-line skills breakdown shown on EVERY agent's detail card: how many
 * skills the agent brings itself, and how the member's own Library skills apply.
 * The member's Library COUNT is `useEnabledSkills().enabledCount` — the set that
 * actually reaches an agent; the agent's own count is a display number that never
 * carries the skill names. Layout-agnostic so each card wraps it in its own
 * section chrome (`DetailSection` vs. the personal card's `Field`).
 */
export const AgentSkillsLines = ({
  agentSkillCount,
  libraryAllowed,
  useEnabledSkills = useEnabledSkills_default,
}: AgentSkillsProps) => {
  const { enabledCount } = useEnabledSkills()
  return (
    <>
      {agentSkillCount > 0 && (
        <p className="text-base text-primary" data-testid="agent-skills-count">
          Agent Skills ({agentSkillCount})
        </p>
      )}
      {libraryAllowed ? (
        <p className="text-base text-primary" data-testid="library-skills-line">
          <Link
            to="/settings/skills"
            className="underline underline-offset-4 transition-colors hover:text-primary"
            data-testid="library-skills-link"
          >
            Skills from your library ({enabledCount})
          </Link>
        </p>
      ) : (
        <p className="text-base text-primary" data-testid="library-skills-line">
          {SEALED_SKILLS_MESSAGE}
        </p>
      )}
    </>
  )
}

/** {@link AgentSkillsLines} wrapped in the card's standard `DetailSection`
 *  chrome — used by the company and Thunderbolt detail cards. */
export const AgentSkillsSection = (props: AgentSkillsProps) => (
  <DetailSection title="Skills">
    <AgentSkillsLines {...props} />
  </DetailSection>
)
