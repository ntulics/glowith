import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProviderProfilePage } from "@/components/marketplace/provider-profile-page";
import { mediaUrl } from "@/lib/media";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await prisma.providerProfile.findUnique({
    where: { handle: `@${handle}` },
    select: { businessName: true, category: true, city: true }
  });
  if (!profile) return { title: "Provider not found" };
  return {
    title: `${profile.businessName} | Glowith`,
    description: `Book ${profile.category} services with ${profile.businessName} in ${profile.city} on Glowith.`
  };
}

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  const profile = await prisma.providerProfile.findUnique({
    where: { handle: `@${handle}` },
    include: {
      user: { select: { name: true, createdAt: true } },
      services: { where: { active: true }, orderBy: { createdAt: "asc" } },
      posts: { orderBy: { createdAt: "desc" } },
      agents: {
        select: {
          id: true, businessName: true, category: true, avatarUrl: true, handle: true,
          services: { where: { active: true }, orderBy: { createdAt: "asc" } }
        }
      },
      _count: { select: { bookings: true } },
      amenities: { select: { amenityKey: true, value: true } }
    }
  });

  if (!profile) notFound();

  // On the freelancer subdomain (freelancer.glowith.co.za/handle), an agent who
  // belongs to a business does not get a freelancer profile — they live only at
  // their business's /team/{handle} route while employed.
  const tenantSlug = (await headers()).get("x-tenant-slug");
  if (tenantSlug === "freelancer" && profile.parentBusinessId) notFound();

  const mapSvc = (s: { id: string; name: string; category: string; durationMinutes: number; priceCents: number; depositCents: number }, performer: string | null) => ({
    id: s.id, name: s.name, category: s.category, durationMinutes: s.durationMinutes,
    priceCents: s.priceCents, depositCents: s.depositCents, performer
  });
  // Business storefront lists its own services + every agent's services.
  const combinedServices = [
    ...profile.services.map((s) => mapSvc(s, null)),
    ...profile.agents.flatMap((a) => a.services.map((s) => mapSvc(s, a.businessName)))
  ];

  return (
    <ProviderProfilePage
      profile={{
        id: profile.id,
        userId: profile.userId,
        handle: profile.handle,
        businessName: profile.businessName,
        name: profile.user.name,
        category: profile.category,
        bio: profile.bio,
        city: profile.city,
        avatarUrl: mediaUrl(profile.avatarUrl),
        verified: profile.verified,
        verifiedBy: profile.verifiedBy,
        mobile: profile.mobile,
        studio: profile.studio,
        providerType: profile.providerType,
        memberSince: profile.user.createdAt.toISOString(),
        appointmentsCompleted: profile._count.bookings,
        services: combinedServices,
        posts: profile.posts.map((p) => ({
          id: p.id,
          caption: p.caption,
          imageUrl: mediaUrl(p.imageUrl) ?? p.imageUrl,
          images: (p.images?.length ? p.images : [p.imageUrl]).map((u) => mediaUrl(u) ?? u),
          tags: p.tags,
          likes: p.likes,
          saves: p.saves,
          featured: p.featured,
          serviceId: p.serviceId
        })),
        amenities: profile.amenities.map((a) => ({ key: a.amenityKey, value: a.value ?? undefined })),
        team: profile.agents.map((a) => ({
          id: a.id,
          name: a.businessName,
          role: a.category,
          avatarUrl: mediaUrl(a.avatarUrl),
          handle: a.handle.replace("@", ""),
          services: a.services.map((s) => mapSvc(s, a.businessName))
        }))
      }}
    />
  );
}
