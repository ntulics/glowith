import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AgentProfilePage } from "@/components/marketplace/agent-profile-page";
import { mediaUrl } from "@/lib/media";

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
      ratings: { select: { stars: true } },
      follows: { select: { id: true } },
      _count: { select: { bookings: { where: { status: "COMPLETED" } }, ratings: true } }
    }
  });
  if (!agent || agent.parentBusinessId !== business.id) return null;

  const businessProfile = await prisma.providerProfile.findUnique({
    where: { id: business.id },
    select: { handle: true, avatarUrl: true, verified: true }
  });

  return { agent, business: { ...business, handle: businessProfile?.handle ?? "", avatarUrl: businessProfile?.avatarUrl ?? null, verified: businessProfile?.verified ?? false } };
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

  const avgRating = agent.ratings.length
    ? agent.ratings.reduce((s, r) => s + r.stars, 0) / agent.ratings.length
    : 0;

  return (
    <AgentProfilePage
      profile={{
        id: agent.id,
        userId: agent.userId,
        handle: agent.handle,
        businessName: agent.businessName,
        name: agent.user.name,
        category: agent.category,
        bio: agent.bio,
        city: agent.city,
        avatarUrl: mediaUrl(agent.avatarUrl),
        verified: agent.verified,
        verifiedBy: agent.verifiedBy ?? undefined,
        memberSince: agent.user.createdAt.toISOString(),
        appointmentsCompleted: agent._count.bookings,
        followerCount: agent.follows.length,
        followingCount: 0,
        reviewCount: agent._count.ratings,
        averageRating: Math.round(avgRating * 10) / 10,
        parentBusinessName: business.businessName,
        parentBusinessHandle: business.handle,
        parentBusinessCity: business.city ?? "",
        parentBusinessAvatarUrl: mediaUrl(business.avatarUrl),
        parentBusinessVerified: business.verified,
        employmentConfirmed: agent.canPostToCompany,
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
          imageUrl: mediaUrl(p.imageUrl) ?? p.imageUrl,
          images: (p.images?.length ? p.images : [p.imageUrl]).map((u) => mediaUrl(u) ?? u),
          tags: p.tags,
          likes: p.likes,
          saves: p.saves,
          featured: p.featured,
          serviceId: p.serviceId
        }))
      }}
    />
  );
}
