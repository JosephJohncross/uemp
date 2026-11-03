import { useState } from 'react'

import type { Me } from '@/lib/types'

/** Letterhead that only appears when a page is printed or saved as PDF. */
export function PrintHeader({ title, user }: { title: string; user: Me }) {
  const profile = user.student_profile
  const [printedAt] = useState(() => new Date().toLocaleString('en-GB'))
  return (
    <div className="hidden space-y-4 border-b pb-4 print:block">
      <div>
        <p className="text-lg font-semibold">UEMP University</p>
        <p className="text-sm">{title}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <dt className="font-medium">Name</dt>
        <dd>{user.full_name}</dd>
        {profile && (
          <>
            <dt className="font-medium">Matric number</dt>
            <dd>{profile.matric_number}</dd>
            <dt className="font-medium">Program</dt>
            <dd>{profile.program_name}</dd>
            <dt className="font-medium">Department / Faculty</dt>
            <dd>
              {profile.department_name}, {profile.faculty_name}
            </dd>
            <dt className="font-medium">Level</dt>
            <dd>{profile.level}</dd>
          </>
        )}
        <dt className="font-medium">Printed</dt>
        <dd>{printedAt}</dd>
      </dl>
    </div>
  )
}
