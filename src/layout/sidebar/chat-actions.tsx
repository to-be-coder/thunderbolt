/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Flame, Loader2, Search } from 'lucide-react'
import type { ChatActionsProps } from './types'

export const ChatActions = ({
  isCollapsed,
  debouncedSearchQuery,
  showSearch,
  deleteAllChatsMutation,
  deleteAllChatsDialogRef,
  onSearchClick,
  middleSlot,
}: ChatActionsProps) => {
  if (isCollapsed) {
    return null
  }

  // "On" while the search input is open OR a query is active.
  const searchActive = showSearch || !!debouncedSearchQuery

  return (
    <div className="flex items-center gap-0.5">
      <SidebarMenuButton
        onClick={(e) => onSearchClick(e)}
        aria-label="Search chats"
        className={cn(
          'w-fit pr-0 pl-0 aspect-square items-center justify-center cursor-pointer',
          searchActive &&
            'bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 hover:text-blue-600 dark:bg-yellow-400/15 dark:text-yellow-300 dark:hover:bg-yellow-400/25 dark:hover:text-yellow-300',
        )}
      >
        <Search className={cn('size-4', searchActive && 'text-blue-600 dark:text-yellow-300')} />
      </SidebarMenuButton>
      {middleSlot}
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton
            onClick={() => deleteAllChatsDialogRef.current?.open()}
            className="w-fit pr-0 pl-0 aspect-square items-center justify-center cursor-pointer"
            disabled={deleteAllChatsMutation.isPending}
          >
            {deleteAllChatsMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Flame className="size-4" />
            )}
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Clear all chats</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
