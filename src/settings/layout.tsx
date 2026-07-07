/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Header } from '@/components/ui/header'
import { SidebarInset } from '@/components/ui/sidebar'
import { PageFallback } from '@/loading'
import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'

// Sub-routes that provide their own page chrome and want the full content height.
// The settings-level Header (sidebar toggle + PowerSync status) would otherwise
// add ~56px of unused space at the top. Matched by prefix so nested detail routes
// (e.g. /settings/agents/:agentId) are covered too.
const routesWithOwnHeader = ['/settings/skills', '/settings/agents']

const SettingsLayout = () => {
  const location = useLocation()
  const showHeader = !routesWithOwnHeader.some(
    (route) => location.pathname === route || location.pathname.startsWith(`${route}/`),
  )

  return (
    <>
      <SidebarInset className="h-full overflow-hidden flex flex-col">
        <div
          className="flex flex-col h-full"
          style={{
            paddingTop: 'var(--safe-area-top-padding)',
            paddingBottom: 'var(--kb, 0px)',
          }}
        >
          {showHeader && <Header />}
          <div
            className="flex-1 overflow-auto"
            style={{
              paddingBottom: 'var(--safe-area-bottom-padding)',
            }}
          >
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </>
  )
}

export default SettingsLayout
