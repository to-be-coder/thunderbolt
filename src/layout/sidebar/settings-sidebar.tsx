/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SidebarFooter } from '@/components/sidebar-footer'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/contexts'
import { useAgentsSettingsHidden } from '@/hooks/use-agents-settings-hidden'
import { ArrowLeft, Bot, PanelLeft, Plug, Server, SlidersHorizontal, Smartphone, Zap } from 'lucide-react'
import { useLocation } from 'react-router'

type SettingsSidebarContentProps = {
  onBackClick: () => void
  onSettingsNavigate: (path: string) => void
  /** Test seam — production omits; the hook falls back to `isTauri()`. Lets
   *  tests exercise Tauri Standalone vs. Hosted code paths without mocking
   *  the shared `@/lib/platform` module (which would leak across files —
   *  see `docs/development/testing.md`). */
  isStandalone?: () => boolean
}

export const SettingsSidebarContent = ({
  onBackClick,
  onSettingsNavigate,
  isStandalone,
}: SettingsSidebarContentProps) => {
  const { toggleSidebar } = useSidebar()
  const location = useLocation()
  const agentsHidden = useAgentsSettingsHidden({ isStandalone })
  // Devices is a per-account, cross-device management surface — anonymous
  // sessions and unauthenticated boots have nothing meaningful to manage there.
  const { data: session } = useAuth().useSession()
  const isLoggedIn = !!session?.user && session.user.isAnonymous !== true
  const subPath = location.pathname

  return (
    <SidebarContent className="flex flex-col h-full">
      {/* In settings, the top slot (where the chat brand logo sits) IS the
          Back-to-chat control; the collapse toggle stays on the right. */}
      <div className="flex h-[var(--touch-height-xl)] shrink-0 items-center gap-1 px-2">
        <SidebarMenu className="flex-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onBackClick}
              tooltip="Back to Chat"
              className="cursor-pointer bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
            >
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenuButton
          onClick={toggleSidebar}
          tooltip="Toggle Sidebar"
          className="size-8 w-auto shrink-0 cursor-pointer justify-center"
        >
          <PanelLeft className="size-[var(--icon-size-default)]" />
          <span className="sr-only">Toggle Sidebar</span>
        </SidebarMenuButton>
      </div>

      {!agentsHidden && (
        <SidebarGroup>
          <SidebarGroupLabel>Agents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSettingsNavigate('/settings/agents')}
                  tooltip="All agents"
                  className="cursor-pointer"
                  isActive={subPath === '/settings/agents'}
                >
                  <Bot className="size-4" />
                  <span>All agents</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      <SidebarGroup>
        <SidebarGroupLabel>What agents use</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onSettingsNavigate('/settings/skills')}
                tooltip="Skills"
                className="cursor-pointer"
                isActive={subPath === '/settings/skills'}
              >
                <Zap className="size-4" />
                <span>Skills</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onSettingsNavigate('/settings/integrations')}
                tooltip="Integrations"
                className="cursor-pointer"
                isActive={subPath === '/settings/integrations'}
              >
                <Plug className="size-4" />
                <span>Integrations</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onSettingsNavigate('/settings/mcp-servers')}
                tooltip="MCP Servers"
                className="cursor-pointer"
                isActive={subPath === '/settings/mcp-servers'}
              >
                <Server className="size-4" />
                <span>MCP Servers</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Account Settings</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onSettingsNavigate('/settings/preferences')}
                tooltip="Preferences"
                className="cursor-pointer"
                isActive={subPath === '/settings/preferences'}
              >
                <SlidersHorizontal className="size-4" />
                <span>Preferences</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isLoggedIn && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSettingsNavigate('/settings/devices')}
                  tooltip="Devices"
                  className="cursor-pointer"
                  isActive={subPath === '/settings/devices'}
                >
                  <Smartphone className="size-4" />
                  <span>Devices</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <div className="flex-1" />

      <SidebarFooter />
    </SidebarContent>
  )
}
