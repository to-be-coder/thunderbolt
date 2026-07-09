/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { LogoutModal } from '@/components/logout-modal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  Bot,
  Boxes,
  ChevronsUpDown,
  Cpu,
  LogOut,
  PanelLeft,
  Server,
  ShieldCheck,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
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
      { to: '/admin/models', label: 'Models', icon: <Cpu /> },
    ],
  },
  {
    label: 'Governance',
    items: [{ to: '/admin/policy', label: 'Policy', icon: <ShieldCheck /> }],
  },
]

/** Persist the collapsed state so it survives reloads — the app's sidebar does
 *  the same via a cookie; the standalone admin nav uses localStorage. */
const COLLAPSE_KEY = 'admin-sidebar-collapsed'

/** Mirrors the app's `SidebarMenuButton` recipe so admin nav rows look identical
 *  to the chat/settings sidebar. */
const navItemBase =
  'flex h-8 items-center rounded-lg text-[length:var(--font-size-body)] outline-hidden transition-colors [&>svg]:size-[var(--icon-size-default)] [&>svg]:shrink-0'

/**
 * Self-contained chrome for the admin console — a collapsible left nav plus a
 * scrolling content pane. Uses the SAME visual language as the main app's sidebar
 * (`bg-sidebar`, group-label captions, `SidebarMenuButton` row styling, a user
 * footer) so the admin console reads as one product with the chat/settings
 * surfaces. The nav collapses to an icon rail via the top-left panel toggle —
 * same behavior as the app, without pulling in the shadcn Sidebar machinery.
 */
export const AdminConsoleLayout = ({ children }: { children: ReactNode }) => {
  const { data: identity } = useAdminIdentity()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === 'true')

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, String(next))
      return next
    })
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <div
        className={cn(
          'flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="flex h-[var(--touch-height-xl)] shrink-0 items-center gap-2 px-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <PanelLeft className="size-[var(--icon-size-default)]" />
          </button>
          {!collapsed && <span className="truncate text-[18px] font-semibold">Admin Console</span>}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
          {navGroups.map((group) => (
            <div key={group.label} className="flex flex-col">
              {!collapsed && (
                <div className="flex h-[var(--touch-height-sm)] items-center px-2 text-xs font-medium text-sidebar-foreground/70">
                  {group.label}
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          navItemBase,
                          collapsed ? 'w-full justify-center' : 'w-full gap-3 px-2',
                          isActive
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                            : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )
                      }
                    >
                      {item.icon}
                      {!collapsed && <span className="truncate">{item.label}</span>}
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
                title={collapsed ? (identity?.email ?? 'Admin') : undefined}
                className={cn(
                  'flex w-full cursor-pointer items-center rounded-lg py-1.5 text-left transition-colors',
                  collapsed ? 'justify-center px-0' : 'gap-2 px-2',
                  menuOpen
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
                  <UserRound className="size-4" />
                </div>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[length:var(--font-size-sm)] font-medium">
                        {identity?.email ?? 'Admin'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">Administrator</p>
                    </div>
                    <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                  </>
                )}
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
