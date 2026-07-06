/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Info, X } from 'lucide-react'

type SealedSlashHintProps = {
  agentName: string
  onDismiss: () => void
}

/**
 * One-time inline note shown when a user types `/` in a thread bound to a sealed
 * company agent or a personal ACP agent — surfaces that skills (`/commands`)
 * aren't available on these agents (T3). Dismissal is persisted by
 * {@link useSealedSlashHint}.
 */
export const SealedSlashHint = ({ agentName, onDismiss }: SealedSlashHintProps) => (
  <div
    role="note"
    data-testid="sealed-slash-hint"
    className="flex items-start gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-[length:var(--font-size-sm)] text-muted-foreground"
  >
    <Info className="mt-0.5 size-[var(--icon-size-default)] shrink-0" />
    <span className="flex-1">
      {agentName} runs exactly as your organization set it up, so custom skills ({'/'}commands) aren't available in this
      chat.
    </span>
    <Button type="button" variant="ghost" size="icon-xs" aria-label="Dismiss" className="shrink-0" onClick={onDismiss}>
      <X className="size-3.5" />
    </Button>
  </div>
)
