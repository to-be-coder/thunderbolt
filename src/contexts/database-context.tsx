/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AnyDrizzleDatabase } from '@/db/database-interface'
import { createContext, useContext, useMemo, type ReactNode } from 'react'

type DatabaseContextType = {
  db: AnyDrizzleDatabase
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export const DatabaseProvider = ({ children, db }: { children: ReactNode; db: AnyDrizzleDatabase }) => {
  const value = useMemo(() => ({ db }), [db])
  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
}

/** Access the Drizzle database instance from React components. */
export const useDatabase = () => {
  const context = useContext(DatabaseContext)
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context.db
}

/** Like {@link useDatabase} but returns null outside a provider instead of
 *  throwing — for optional, demo-only paths (e.g. the admin console mirroring an
 *  edit into the member cache) that must stay renderable without the DB context,
 *  such as in unit tests. */
export const useOptionalDatabase = (): AnyDrizzleDatabase | null => useContext(DatabaseContext)?.db ?? null
