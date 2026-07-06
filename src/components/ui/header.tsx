/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { Menu, MessageCirclePlus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { PowerSyncStatus } from '@/components/powersync-status'

/**
 * Reusable page header component with the sidebar trigger and (on mobile) a new-chat
 * shortcut. Agent selection lives in the chat composer's top-left slot
 * (`ChatAgentSelector`); model selection lives beside it in the composer.
 */
export const Header = () => {
  const { toggleSidebar } = useSidebar()
  const { isMobile } = useIsMobile()
  const navigate = useNavigate()
  const location = useLocation()

  const isChatRoute = location.pathname.startsWith('/chats')

  const handleNewChat = () => {
    navigate('/chats/new')
  }

  // Mobile: sidebar trigger left, new-chat shortcut right.
  if (isMobile) {
    const showNewChatButton = isChatRoute && location.pathname !== '/chats/new'

    return (
      <header className="flex h-[var(--touch-height-xl)] w-full items-center justify-between px-2 flex-shrink-0">
        <div className="flex flex-1 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-[var(--touch-height-sm)] cursor-pointer"
            onClick={toggleSidebar}
          >
            <Menu className="size-[var(--icon-size-default)]" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>

        <div className="flex flex-1 items-center gap-1 justify-end">
          {showNewChatButton && (
            <Button
              variant="ghost"
              size="icon"
              className="size-[var(--touch-height-sm)] cursor-pointer"
              onClick={handleNewChat}
            >
              <MessageCirclePlus className="size-[var(--icon-size-default)]" />
              <span className="sr-only">New Chat</span>
            </Button>
          )}
        </div>
      </header>
    )
  }

  // Desktop: sidebar trigger left, PowerSync status right.
  return (
    <header className="flex h-[var(--touch-height-xl)] w-full items-center justify-between px-2 flex-shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="size-[var(--touch-height-sm)] cursor-pointer"
        onClick={toggleSidebar}
      >
        <Menu className="size-[var(--icon-size-default)]" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
      <PowerSyncStatus />
    </header>
  )
}
