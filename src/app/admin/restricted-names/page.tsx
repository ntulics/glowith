import { prisma } from "@/lib/prisma";
import { RestrictedNamesManager } from "@/components/admin/restricted-names-manager";

export default async function RestrictedNamesPage() {
  const names = await prisma.restrictedName.findMany({ orderBy: { createdAt: "desc" } });
  return <RestrictedNamesManager initial={names.map((n) => ({ id: n.id, name: n.name, reason: n.reason ?? "", createdAt: n.createdAt.toISOString() }))} />;
}
