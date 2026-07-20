/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppLogo } from '@/components/app-logo'
import { LogoutModal } from '@/components/logout-modal'
import { MobileSidebar } from '@/components/ui/mobile-sidebar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useIsCompactSidebar, useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Bot, Boxes, ChevronsUpDown, Cpu, LogOut, PanelLeft, Server, UserRound, Users, Zap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { AdminChromeProvider } from './admin-chrome'
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
      { to: '/admin/mcp', label: 'MCP Servers', icon: <Server /> },
      { to: '/admin/models', label: 'Models', icon: <Cpu /> },
    ],
  },
]

/** Persist the collapsed state so it survives reloads — the app's sidebar does
 *  the same via a cookie; the standalone admin nav uses localStorage. */
const collapseKey = 'admin-sidebar-collapsed'

/** Mirrors the app's `SidebarMenuButton` recipe so admin nav rows look identical
 *  to the chat/settings sidebar. */
// Height mirrors the member app's SidebarMenuButton (`h-[touch-height-default] md:h-8`)
// so the mobile off-canvas nav rows are the same size — a taller 44px touch target
// on mobile, 32px on desktop — with the same body text and default icon size.
const navItemBase =
  'flex h-[var(--touch-height-default)] items-center rounded-lg text-[length:var(--font-size-body)] outline-hidden transition-colors md:h-8 [&>svg]:size-[var(--icon-size-default)] [&>svg]:shrink-0'

type AdminNavProps = {
  /** Icon-rail (desktop only). Mobile off-canvas always renders expanded. */
  collapsed: boolean
  identity: { email?: string } | undefined
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onLogout: () => void
  /** Desktop only — shows the collapse toggle in the header. */
  onToggleCollapse?: () => void
  /** Mobile only — dismiss the off-canvas nav after navigating. */
  onNavigate?: () => void
}

/**
 * The admin nav body — header (title + optional collapse toggle), nav groups, and
 * the user footer. Rendered inside the desktop rail AND the mobile off-canvas
 * sheet (which supplies its own `bg-sidebar`), so the two share one nav.
 */
const AdminNav = ({
  collapsed,
  identity,
  menuOpen,
  onMenuOpenChange,
  onLogout,
  onToggleCollapse,
  onNavigate,
}: AdminNavProps) => (
  <>
    <div
      className={cn('flex h-[var(--touch-height-xl)] shrink-0 items-center gap-2 px-2', collapsed && 'justify-center')}
    >
      {!collapsed && (
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
          {/* The off-canvas nav (no collapse toggle) leads with the brand mark,
              matching the member app's sidebar header. */}
          {!onToggleCollapse && <AppLogo size={20} className="shrink-0" />}
          <span className="truncate text-[18px] font-semibold">Admin Console</span>
        </div>
      )}
      {collapsed && !onToggleCollapse && <AppLogo size={20} className="shrink-0" />}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PanelLeft className="size-[var(--icon-size-default)]" />
        </button>
      )}
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
                  onClick={onNavigate}
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
      <Popover open={menuOpen} onOpenChange={onMenuOpenChange}>
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
                  <p className="truncate text-[length:var(--font-size-sm)] font-medium">{identity?.email ?? 'Admin'}</p>
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
            onClick={() => onMenuOpenChange(false)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
          >
            <Zap className="size-4 text-muted-foreground" />
            Open Thunderbolt
          </a>
          <button
            type="button"
            onClick={() => {
              onMenuOpenChange(false)
              onLogout()
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
          >
            <LogOut className="size-4 text-muted-foreground" />
            Log out
          </button>
        </PopoverContent>
      </Popover>
    </div>
  </>
)

/**
 * Self-contained chrome for the admin console — a nav plus a scrolling content
 * pane, in the SAME visual language as the main app's sidebar so the console
 * reads as one product. Responsive like the member app:
 *  • Desktop — a persistent left rail that collapses to an icon rail (top-left
 *    panel toggle, persisted).
 *  • Mobile — the rail goes off-canvas. A burger app-bar opens it via the shared
 *    {@link MobileSidebar} (the exact overlay the chat/settings app uses — a
 *    blurred scrim + a drag-to-dismiss sheet), so the layering matches.
 */
export const AdminConsoleLayout = ({ children }: { children: ReactNode }) => {
  const { data: identity } = useAdminIdentity()
  const { isMobile } = useIsMobile()
  const { isCompactSidebar } = useIsCompactSidebar()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(collapseKey) === 'true')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const isNavCollapsed = collapsed || isCompactSidebar

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(collapseKey, String(next))
      return next
    })
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      {isMobile ? (
        <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <AdminNav
            collapsed={false}
            identity={identity}
            menuOpen={menuOpen}
            onMenuOpenChange={setMenuOpen}
            onLogout={() => setLogoutOpen(true)}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </MobileSidebar>
      ) : (
        <div
          className={cn(
            'flex shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200',
            isNavCollapsed ? 'w-16' : 'w-64',
          )}
        >
          <AdminNav
            collapsed={isNavCollapsed}
            identity={identity}
            menuOpen={menuOpen}
            onMenuOpenChange={setMenuOpen}
            onLogout={() => setLogoutOpen(true)}
            onToggleCollapse={isCompactSidebar ? undefined : toggleCollapsed}
          />
        </div>
      )}

      {/* The page owns its header on mobile (burger + centered title + actions,
          via AdminPageHeader), so there's no separate app bar here — just the
          safe-area inset the bar used to carry. */}
      <div
        className="flex min-w-0 flex-1 flex-col"
        style={isMobile ? { paddingTop: 'calc(var(--safe-area-top-padding, 0px) + var(--header-top-gap))' } : undefined}
      >
        <main className="flex-1 overflow-auto p-6">
          <AdminChromeProvider value={{ openMobileNav: () => setMobileNavOpen(true) }}>{children}</AdminChromeProvider>
        </main>
      </div>

      <LogoutModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  )
}
