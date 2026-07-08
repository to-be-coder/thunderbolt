/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppLogo } from '@/components/app-logo'
import { LogoutModal } from '@/components/logout-modal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Bot, Boxes, ChevronsUpDown, LogOut, Server, ShieldCheck, UserRound, Users, Zap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useAdminIdentity } from './api/hooks'

type AdminNavItem = { to: string; label: string; icon: ReactNode; end?: boolean }
type AdminNavGroup = { label: string; items: AdminNavItem[] }

const navGroups: AdminNavGroup[] = [
  {
    label: 'Manage',
    items: [
      { to: '/admin', label: 'Agents', icon: <Bot />, end: true },
      { to: '/admin/members', label: 'Members', icon: <Users /> },
      { to: '/admin/groups', label: 'Groups', icon: <Boxes /> },
    ],
  },
  {
    label: 'Company',
    items: [
      { to: '/admin/skills', label: 'Skills', icon: <Zap /> },
      { to: '/admin/mcp', label: 'MCP Servers', icon: <Server /> },
    ],
  },
  {
    label: 'Governance',
    items: [{ to: '/admin/policy', label: 'Policy', icon: <ShieldCheck /> }],
  },
]

/** Mirrors the app's `SidebarMenuButton` recipe so admin nav rows look identical
 *  to the chat/settings sidebar. */
const navItemClass =
  'flex h-8 w-full items-center gap-3 rounded-lg p-2 text-[length:var(--font-size-body)] outline-hidden transition-colors [&>svg]:size-[var(--icon-size-default)] [&>svg]:shrink-0'

/**
 * Self-contained chrome for the admin console — a fixed left nav plus a scrolling
 * content pane. Uses the SAME visual language as the main app's sidebar
 * (`bg-sidebar`, group-label captions, `SidebarMenuButton` row styling, a brand
 * header and a user footer) so the admin console reads as one product with the
 * chat/settings surfaces, without pulling in the collapsible Sidebar machinery.
 */
export const AdminConsoleLayout = ({ children }: { children: ReactNode }) => {
  const { data: identity } = useAdminIdentity()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <div className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-[var(--touch-height-xl)] shrink-0 items-center gap-2 px-3">
          <AppLogo size={20} />
          <span className="text-[18px] font-semibold">Admin Console</span>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
          {navGroups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <div className="flex h-[var(--touch-height-sm)] items-center px-2 text-xs font-medium text-sidebar-foreground/70">
                {group.label}
              </div>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          navItemClass,
                          isActive
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                            : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )
                      }
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 p-2">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                  menuOpen
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
                  <UserRound className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[length:var(--font-size-sm)] font-medium">{identity?.email ?? 'Admin'}</p>
                  <p className="truncate text-xs text-muted-foreground">Administrator</p>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" side="top" className="w-56 p-1">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
              >
                <Zap className="size-4 text-muted-foreground" />
                Open Thunderbolt
              </a>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setLogoutOpen(true)
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
              >
                <LogOut className="size-4 text-muted-foreground" />
                Log out
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <main className="flex-1 overflow-auto p-6">{children}</main>
      <LogoutModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  )
}
