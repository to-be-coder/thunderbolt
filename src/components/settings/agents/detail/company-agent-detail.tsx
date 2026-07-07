/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AgentCard, AgentCardCapability } from '@shared/agent-cards'
import { AgentDetailLayout, DetailSection } from './agent-detail-layout'
import { CompanyCapabilityRow } from './company-capability-row'
import { ManageInLibraryLink } from '../manage-in-library-link'

/**
 * External team agents reach their upstream through the service-identity relay,
 * which strips the caller bearer — so the transport CANNOT pass the invoker's
 * identity (Stage-3 finding). `as_you` capabilities therefore resolve to
 * `unsupported_as_you` and show truthfully. This is the v1 constant.
 */
const TRANSPORT_PASSES_INVOKER = false

/** The category banner translates the card's category into member language —
 *  the only place the sealed/extensible concept surfaces (agents-page-spec §3). */
const CategoryBanner = ({ card, agentId }: { card: AgentCard; agentId: string }) => {
  if (card.category === 'extensible') {
    return (
      <div className="rounded-lg border border-border p-3 flex flex-col gap-1" data-testid="category-banner-extensible">
        <p className="text-[length:var(--font-size-body)] font-medium">✅ Works with your skills</p>
        <p className="text-[length:var(--font-size-sm)] text-muted-foreground">
          Your enabled Library items are available to this agent.
        </p>
        <ManageInLibraryLink agentKind="team" agentId={agentId} />
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-1" data-testid="category-banner-sealed">
      <p className="text-[length:var(--font-size-body)] font-medium">🔒 Comes fully configured</p>
      <p className="text-[length:var(--font-size-sm)] text-muted-foreground">
        This agent uses only what your organization built into it.
      </p>
    </div>
  )
}

type CompanyAgentDetailProps = {
  card: AgentCard
  onBack: () => void
  onConnectCapability?: (capability: AgentCardCapability) => void
  onDisconnectCapability?: (capability: AgentCardCapability) => void
}

/**
 * Read-only rendered agent card for a company (team) agent (agents-page-spec §3).
 * The card is DISPLAY-ONLY (INVARIANT 2) — capabilities are plain-language
 * labels, never skill names or prompt text. The only interactive elements are
 * the `as_you` credential rows (Connect / Disconnect) and Start a chat. Model is
 * "set by your organization"; the footer reserves the report-a-problem slot
 * (P1-3, not built in v1).
 */
export const CompanyAgentDetail = ({
  card,
  onBack,
  onConnectCapability = () => {},
  onDisconnectCapability = () => {},
}: CompanyAgentDetailProps) => (
  <AgentDetailLayout
    name={card.name}
    subtitle={`From ${card.managedBy} · granted via: ${card.grantedVia}`}
    body={
      <>
        {card.description && (
          <p className="text-[length:var(--font-size-body)] italic text-muted-foreground">“{card.description}”</p>
        )}

        <CategoryBanner card={card} agentId={card.id} />

        <DetailSection title="What it can do">
          <ul className="flex flex-col" data-testid="capability-list">
            {card.capabilities.map((capability, index) => (
              <CompanyCapabilityRow
                // Capability labels are display copy and may repeat; index keys
                // are stable for this static, non-reordered list.
                key={`${capability.label}-${index}`}
                capability={capability}
                transportPassesInvoker={TRANSPORT_PASSES_INVOKER}
                onConnect={onConnectCapability}
                onDisconnect={onDisconnectCapability}
              />
            ))}
          </ul>
        </DetailSection>

        <div className="flex flex-col gap-1 text-[length:var(--font-size-sm)] text-muted-foreground">
          <p data-testid="company-model-line">Model: set by your organization</p>
          <p data-testid="company-managed-by">Managed by: {card.managedBy}</p>
        </div>
      </>
    }
    onBack={onBack}
  />
)
