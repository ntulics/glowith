import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProviderProfilePage } from "@/components/marketplace/provider-profile-page";

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
      _count: { select: { bookings: true } }
    }
  });

  if (!profile) notFound();

  return (
    <ProviderProfilePage
      profile={{
        id: profile.id,
        handle: profile.handle,
        businessName: profile.businessName,
        name: profile.user.name,
        category: profile.category,
        bio: profile.bio,
        city: profile.city,
        avatarUrl: profile.avatarUrl,
        verified: profile.verified,
        mobile: profile.mobile,
        studio: profile.studio,
        providerType: profile.providerType,
        memberSince: profile.user.createdAt.toISOString(),
        appointmentsCompleted: profile._count.bookings,
        services: profile.services.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
          depositCents: s.depositCents
        })),
        posts: profile.posts.map((p) => ({
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
