import "server-only";

import { parseCmsSchedulePayload } from "@/lib/cms-scheduler";
import { prisma } from "@/lib/prisma";

type ActiveScheduleRow = {
  id: string;
  valueJson: string;
};

export async function quarantineMalformedActiveSchedules() {
  const rows = await prisma.$queryRaw<ActiveScheduleRow[]>`
    SELECT id, valueJson
    FROM SiteContent
    WHERE namespace = 'cms_schedule'
      AND status = 'published'
    ORDER BY createdAt ASC
    LIMIT 500
  `;

  const malformedIds = rows
    .filter((row) => !parseCmsSchedulePayload(row.valueJson))
    .map((row) => row.id);

  for (const id of malformedIds) {
    await prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'archived', updatedAt = CURRENT_TIMESTAMP(3)
      WHERE id = ${id}
        AND namespace = 'cms_schedule'
        AND status = 'published'
    `;
  }

  return { scanned: rows.length, quarantined: malformedIds.length };
}
