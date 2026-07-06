/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

/**
 * Info tooltip explaining the sealed vs extensible category, shown next to the
 * Category label in the agent register form and the detail panel.
 */
export const CategoryInfoTooltip = () => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="What do sealed and extensible mean?"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="size-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-sm">
      <p className="font-medium">Sealed</p>
      <p className="mb-2">
        Runs exactly as your organization configured it — members can’t add skills or change its model.
      </p>
      <p className="font-medium">Extensible</p>
      <p>Members’ enabled skills and models can extend it, where org policy allows.</p>
    </TooltipContent>
  </Tooltip>
)
