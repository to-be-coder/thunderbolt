/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PageHeader } from '@/components/ui/page-header'

/** Admin Skills — placeholder while the company-scoped skills experience is
 *  designed. Intentionally minimal for now. */
export const SkillsPage = () => (
  <div className="mx-auto flex w-full max-w-[728px] flex-col gap-6">
    <PageHeader title="Skills" />
    <p className="text-sm text-muted-foreground">TBD</p>
  </div>
)
