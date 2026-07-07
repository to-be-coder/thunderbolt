/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AgentDetailLayout } from './agent-detail-layout'

/**
 * Collapsed detail state when a grant is revoked while the member is on the
 * agent's detail view (agents-page-spec §5): content collapses to a name + a
 * banner, and Back returns to the list. Also the safe fallback for any agent id
 * that no longer resolves. The request-access link slot is reserved here
 * (P1-8, not built in v1).
 */
export const RevokedAgentDetail = ({ onBack }: { onBack: () => void }) => (
  <AgentDetailLayout
    name="Agent unavailable"
    subtitle=""
    body={
      <div className="rounded-lg border border-border p-3" data-testid="agent-revoked-banner">
        <p className="text-[length:var(--font-size-body)]">Your access to this agent was removed.</p>
      </div>
    }
    onBack={onBack}
  />
)
