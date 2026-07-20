/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { Menu, MessageCirclePlus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { PowerSyncStatus } from '@/components/powersync-status'
import { HeaderAgentSelector } from '@/components/chat/header-agent-selector'

/**
 * Reusable page header component with the sidebar trigger and (on mobile) a new-chat
 * shortcut. On chat routes it also hosts the agent selector in the top-left slot
 * beside the sidebar toggle (PRD §2.3); model and mode selection live in the
 * composer.
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
      <header className="relative flex h-[var(--touch-height-xl)] w-full items-center justify-between px-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 cursor-pointer rounded-md text-muted-foreground hover:text-foreground"
            onClick={toggleSidebar}
          >
            <Menu />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>

        {/* Agent selector centered like a page title (burger left, new-chat
            right). It stays interactive — its own max-width keeps it in the
            middle third so it never overlaps the flanking buttons. */}
        {isChatRoute && (
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center">
            <HeaderAgentSelector />
          </div>
        )}

        <div className="flex items-center gap-1 justify-end">
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

  // Desktop: on chat routes the agent selector owns the top-left slot (the
  // sidebar has its own collapse toggle + ⌘B, so no burger is needed here); on
  // other routes the sidebar toggle stays. PowerSync status sits on the right.
  return (
    <header className="flex h-[var(--touch-height-xl)] w-full items-center justify-between px-2 flex-shrink-0">
      <div className="flex min-w-0 items-center gap-1">
        {isChatRoute ? (
          <HeaderAgentSelector />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="size-[var(--touch-height-sm)] cursor-pointer"
            onClick={toggleSidebar}
          >
            <Menu className="size-[var(--icon-size-default)]" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        )}
      </div>
      <PowerSyncStatus />
    </header>
  )
}
