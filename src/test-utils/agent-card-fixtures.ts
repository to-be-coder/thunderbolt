/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AgentCard } from '@shared/agent-cards'

/**
 * Fixture `AgentCard` set for Stage 2 component tests. Stage 3 discovery is not
 * built and the dev `team_agents_cache` is empty, so the member-chat surfaces
 * are driven from these display-only cards (shared/agent-cards.ts shape) in
 * tests. Covers one `sealed` and one `extensible` company agent.
 */

/** A sealed company agent — runs exactly as the org configured it. Advertises a
 *  single model (renders as a static chip) and has no user-extensible surface,
 *  so the skills bar is ABSENT and a first `/` fires the seal-hit signal. */
export const sealedTeamAgent: AgentCard = {
  id: 'team-sealed-support',
  name: 'Support Copilot',
  icon: 'life-buoy',
  description: 'Answers customer questions from the company knowledge base.',
  category: 'sealed',
  capabilities: [
    { label: 'Search Confluence', credentialMode: 'service_account' },
    { label: 'Read Zendesk tickets', credentialMode: 'service_account' },
  ],
  advertisedModels: ['Company GPT-4o'],
  managedBy: 'Acme Support',
  grantedVia: 'Support team',
}

/** An extensible company agent — accepts user-side additions where org policy
 *  allows, so the skills bar renders the user's enabled Library items. Advertises
 *  multiple models (renders as a bounded picker). */
export const extensibleTeamAgent: AgentCard = {
  id: 'team-extensible-research',
  name: 'Research Assistant',
  icon: 'flask-conical',
  description: 'Deep research across company and public sources.',
  category: 'extensible',
  capabilities: [{ label: 'Web search' }, { label: 'Read internal docs', credentialMode: 'as_you', connected: true }],
  advertisedModels: ['Company GPT-4o', 'Company Claude Sonnet'],
  managedBy: 'Acme Research',
  grantedVia: 'Research team',
}

/** Both fixture cards, alpha by name — matches `getTeamAgentsCache` ordering. */
export const teamAgentCardFixtures: AgentCard[] = [extensibleTeamAgent, sealedTeamAgent]
