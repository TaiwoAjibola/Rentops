import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableCell, TableRow } from "@/components/ui/data";

export default async function AdminCategoriesPage() {
  await requirePlatformStaff("category.manage");

  const [categories, locations] = await Promise.all([
    prisma.propertyCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  const categoryCounts = await prisma.property.groupBy({
    by: ["categoryId"],
    _count: { _all: true },
  });
  const countByCategory = new Map(categoryCounts.map((row) => [row.categoryId, row._count._all]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Categories & locations"
        description="What partners can list under, and where it lives."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={`Property categories · ${categories.length}`} bodyClassName="p-0">
          {categories.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">No categories yet.</p>
          ) : (
            <DataTable headers={["Name", "Listings", "Status"]}>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{countByCategory.get(category.id) ?? 0}</TableCell>
                  <TableCell>
                    <Badge tone={category.isActive ? "success" : "neutral"}>
                      {category.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
          )}
        </Panel>

        <Panel title={`Locations · ${locations.length}`} bodyClassName="p-0">
          {locations.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">No locations yet.</p>
          ) : (
            <DataTable headers={["Name", "City / State"]}>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>{location.name}</TableCell>
                  <TableCell>
                    {[location.city, location.state].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
          )}
        </Panel>
      </div>
    </div>
  );
}
