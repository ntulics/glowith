import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CatalogView } from "@/components/dashboard/catalog-view";

export default async function CatalogPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: { services: { orderBy: { createdAt: "asc" } } }
  });

  if (!profile) redirect("/signup");

  return <CatalogView profileId={profile.id} services={profile.services.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    durationMinutes: s.durationMinutes,
    priceCents: s.priceCents,
    depositCents: s.depositCents,
    active: s.active
  }))} />;
}
