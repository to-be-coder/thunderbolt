/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AdminPageHeader } from '../admin-chrome'

/** Admin MCP — placeholder while the company-scoped MCP experience is designed. */
export const McpPage = () => (
  <div className="mx-auto flex w-full max-w-[728px] flex-col gap-6 -mt-6 md:mt-0">
    <AdminPageHeader title="MCP Servers" />
    <p className="text-sm text-muted-foreground">TBD</p>
  </div>
)
