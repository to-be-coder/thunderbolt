/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'

/** Mobile-only sidebar burger. Rendered only when `isMobile`, so `useSidebar` is
 *  never reached on desktop (or in provider-less tests). Uses lucide's default
 *  stroke so its weight matches the header's `+` action button. */
const MobileSidebarToggle = () => {
  const { toggleSidebar } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label="Open menu"
      className="size-8 -ml-1 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
    >
      <Menu />
    </Button>
  )
}

/**
 * The settings pages' header. On mobile it takes the skills page's layout — a
 * sidebar burger on the left, the title centered, actions on the right — since
 * these pages own their header (the shared mobile `Header` is suppressed for
 * them). On desktop it's the plain {@link PageHeader}. Use this instead of
 * `PageHeader` directly on any settings route listed in the layout's
 * `routesWithOwnHeader`.
 */
export const SettingsPageHeader = ({ title, children }: { title: string; children?: ReactNode }) => {
  const { isMobile } = useIsMobile()
  return (
    <PageHeader
      title={title}
      leading={isMobile ? <MobileSidebarToggle /> : undefined}
      centerTitle={isMobile}
      titleClassName={isMobile ? 'text-xl font-normal leading-tight tracking-normal text-foreground' : undefined}
    >
      {children}
    </PageHeader>
  )
}
