/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { cn } from '@/lib/utils'
import { Boxes, ClipboardList, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

type AdminNavItem = { to: string; label: string; icon: ReactNode; end?: boolean }

const navItems: AdminNavItem[] = [
  { to: '/admin', label: 'Registry', icon: <Boxes className="size-4" />, end: true },
  { to: '/admin/members', label: 'Members', icon: <Users className="size-4" /> },
  { to: '/admin/groups', label: 'Groups', icon: <Boxes className="size-4" /> },
  { to: '/admin/policy', label: 'Policy', icon: <ShieldCheck className="size-4" /> },
]

/**
 * Self-contained chrome for the admin console — a fixed left nav plus a scrolling
 * content pane. Deliberately does NOT reuse the chat app's Sidebar (which is wired
 * to chat state); visual parity with the main app is not a v1 goal.
 */
export const AdminConsoleLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border p-3">
      <div className="flex items-center gap-2 px-2 pb-3 pt-1">
        <ClipboardList className="size-5 text-primary" />
        <span className="text-lg font-semibold">Admin Console</span>
      </div>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
    <main className="flex-1 overflow-auto p-6">{children}</main>
  </div>
)
