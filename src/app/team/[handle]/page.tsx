import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProviderProfilePage } from "@/components/marketplace/provider-profile-page";

// Resolves the business that owns this subdomain from the x-tenant-slug header,
// then finds the agent (by handle) that belongs to that business. An agent who
// has left the business (parentBusinessId === null) no longer resolves here —
// their profile lives at freelancer.glowith.co.za/{handle} instead.
async function resolveAgent(handleParam: string) {
  const headerStore = await headers();
  const tenantSlug = headerStore.get("x-tenant-slug");
  if (!tenantSlug) return null;

  const business = await prisma.providerProfile.findUnique({
    where: { handle: `@${tenantSlug}` },
    select: { id: true, businessName: true, city: true }
  });
  if (!business) return null;

  const agent = await prisma.providerProfile.findUnique({
    where: { handle: `@${handleParam}` },
    include: {
      user: { select: { name: true, createdAt: true } },
      services: { where: { active: true }, orderBy: { createdAt: "asc" } },
      posts: { orderBy: { createdAt: "desc" } },
      _count: { select: { bookings: true } }
    }
  });
  if (!agent || agent.parentBusinessId !== business.id) return null;

  return { agent, business };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const resolved = await resolveAgent(handle);
  if (!resolved) return { title: "Team member not found" };
  const { agent, business } = resolved;
  return {
    title: `${agent.businessName} · ${business.businessName} | Glowith`,
    description: `Book ${agent.category} services with ${agent.businessName} at ${business.businessName} on Glowith.`
  };
}

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const resolved = await resolveAgent(handle);
  if (!resolved) notFound();
  const { agent, business } = resolved;

  return (
    <ProviderProfilePage
      profile={{
        id: agent.id,
        parentBusinessName: business.businessName,
        parentBusinessCity: business.city,
        handle: agent.handle,
        businessName: agent.businessName,
        name: agent.user.name,
        category: agent.category,
        bio: agent.bio,
        city: agent.city,
        avatarUrl: agent.avatarUrl,
        verified: agent.verified,
        verifiedBy: agent.verifiedBy,
        mobile: agent.mobile,
        studio: agent.studio,
        providerType: agent.providerType,
        memberSince: agent.user.createdAt.toISOString(),
        appointmentsCompleted: agent._count.bookings,
        services: agent.services.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
          depositCents: s.depositCents
        })),
        posts: agent.posts.map((p) => ({
          id: p.id,
          caption: p.caption,
          imageUrl: p.imageUrl,
          tags: p.tags,
          likes: p.likes,
          saves: p.saves
        }))
      }}
    />
  );
}
