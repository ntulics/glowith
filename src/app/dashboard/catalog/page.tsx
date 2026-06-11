import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CatalogView } from "@/components/dashboard/catalog-view";

export default async function CatalogPage() {
  const session = await auth();
  const user = session?.user as any;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: {
      services: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        include: { agents: { select: { agentId: true } } }
      }
    }
  });

  if (!profile) redirect("/signup");

  // Load agents connected to this provider (agents are ProviderProfiles with parentBusinessId)
  const agentProfiles = await prisma.providerProfile.findMany({
    where: { parentBusinessId: profile.id },
    select: {
      id: true, businessName: true, avatarUrl: true,
      services: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        include: { agents: { select: { agentId: true } } }
      }
    }
  });

  const ownServices = profile.services.map((s) => ({
    id: s.id, name: s.name, category: s.category,
    categoryId: (s as any).categoryId ?? null,
    description: (s as any).description ?? null,
    durationMinutes: s.durationMinutes, priceCents: s.priceCents,
    depositCents: s.depositCents, depositIsPercent: s.depositIsPercent,
    active: s.active, agents: s.agents, ownerName: null as string | null,
  }));

  const agentServices = agentProfiles.flatMap((a) =>
    a.services.map((s) => ({
      id: s.id, name: s.name, category: s.category,
      categoryId: (s as any).categoryId ?? null,
      description: (s as any).description ?? null,
      durationMinutes: s.durationMinutes, priceCents: s.priceCents,
      depositCents: s.depositCents, depositIsPercent: s.depositIsPercent,
      active: s.active, agents: s.agents, ownerName: a.businessName,
    }))
  );

  return (
    <CatalogView
      profileId={profile.id}
      services={[...ownServices, ...agentServices]}
      agents={agentProfiles.map((a) => ({ id: a.id, businessName: a.businessName, avatarUrl: a.avatarUrl }))}
    />
  );
}
