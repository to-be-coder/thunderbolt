/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createContext, useContext, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { useIsMobile } from '@/hooks/use-mobile'

type AdminChrome = {
  /** Open the off-canvas admin nav (mobile). */
  openMobileNav: () => void
}

// Default no-op so a page rendered without the layout (unit tests) — where the
// mobile burger never mounts anyway — doesn't throw.
const AdminChromeContext = createContext<AdminChrome>({ openMobileNav: () => {} })

export const AdminChromeProvider = ({ value, children }: { value: AdminChrome; children: ReactNode }) => (
  <AdminChromeContext.Provider value={value}>{children}</AdminChromeContext.Provider>
)

const useAdminChrome = () => useContext(AdminChromeContext)

/** Mobile-only burger that opens the admin off-canvas nav. Matches the settings
 *  pages' burger (size-8, muted, default Menu stroke). */
const AdminNavBurger = () => {
  const { openMobileNav } = useAdminChrome()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={openMobileNav}
      aria-label="Open menu"
      className="size-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
    >
      <Menu />
    </Button>
  )
}

/**
 * The admin pages' header. On mobile it takes the settings/skills layout — a nav
 * burger on the left, the page title centered, the page's actions on the right —
 * so there's ONE header per page (no separate app bar). On desktop it's the plain
 * {@link PageHeader}. Use this instead of `PageHeader` on every admin screen.
 */
export const AdminPageHeader = ({ title, children }: { title: string; children?: ReactNode }) => {
  const { isMobile } = useIsMobile()
  return (
    <PageHeader
      title={title}
      leading={isMobile ? <AdminNavBurger /> : undefined}
      centerTitle={isMobile}
      titleClassName={isMobile ? 'text-xl font-normal leading-tight tracking-normal text-foreground' : undefined}
    >
      {children}
    </PageHeader>
  )
}
