import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { DataTable, TableCell, TableRow } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/admin/ui";
import { formatMoney } from "@/lib/money";

export default async function AdminDueDiligencePage() {
  await requirePlatformStaff("platform.config");

  const policies = await prisma.dueDiligencePolicy.findMany({
    orderBy: [{ sortOrder: "asc" }, { minDays: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Due diligence"
        description="Thresholds that trigger verification recommendations for longer stays. Recommendation only — partners still decide."
      />

      <Panel title="How it works">
        <p className="text-sm leading-relaxed text-ink-600">
          A policy with <code>minDays</code> set to <em>n</em> means stays of <em>n</em> nights or longer trigger the
          recommendation text. Mandatory policies require the action before a booking is confirmed.
        </p>
      </Panel>

      {policies.length === 0 ? (
        <p className="text-sm text-ink-500">
          No policies configured — the booking engine treats every stay without a threshold.
        </p>
      ) : (
        <DataTable headers={["Name", "Triggers at", "Text", "Verification", "Mandatory", "Charge", "Status"]}>
          {policies.map((policy) => (
            <TableRow key={policy.id}>
              <TableCell>{policy.name}</TableCell>
              <TableCell>
                {policy.minDays}+ nights{policy.maxDays ? ` up to ${policy.maxDays}` : ""}
              </TableCell>
              <TableCell>{policy.recommendationText}</TableCell>
              <TableCell>{Array.isArray(policy.verificationTypes) ? (policy.verificationTypes as string[]).join(", ") : "—"}</TableCell>
              <TableCell>{policy.mandatory ? "Yes" : "No"}</TableCell>
              <TableCell>{formatMoney(policy.chargeMinor, policy.currency, { compact: true })}</TableCell>
              <TableCell>
                <Badge tone={policy.isActive ? "success" : "neutral"}>{policy.isActive ? "Active" : "Disabled"}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
