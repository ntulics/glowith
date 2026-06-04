import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";

// Public marketplace list — real DB providers (businesses & standalone freelancers)
// that have at least one active service and one portfolio photo, shaped for the cards.
export async function GET() {
  const profiles = await prisma.providerProfile.findMany({
    where: {
      providerType: { in: ["BUSINESS", "FREELANCER"] },
      parentBusinessId: null,
      services: { some: { active: true } },
      posts: { some: {} }
    },
    include: {
      services: { where: { active: true }, orderBy: { createdAt: "asc" } },
      posts: { orderBy: { createdAt: "desc" }, take: 6 },
      ratings: { select: { stars: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 60
  });

  const providers = profiles.map((p) => {
    const avg = p.ratings.length
      ? Math.round((p.ratings.reduce((s, r) => s + r.stars, 0) / p.ratings.length) * 10) / 10
      : 5.0;
    return {
      id: p.id,
      handle: p.handle,
      name: p.businessName,
      businessName: p.businessName,
      category: p.category,
      rating: avg,
      reviewCount: p.ratings.length,
      distanceKm: 0,
      location: { label: p.city || "South Africa", lat: p.latitude, lng: p.longitude },
      verified: p.verified,
      mobile: p.mobile,
      studio: p.studio,
      nextAvailable: "Today",
      bio: p.bio,
      services: p.services.map((s) => ({
        id: s.id, name: s.name, category: s.category,
        durationMinutes: s.durationMinutes, priceCents: s.priceCents, depositCents: s.depositCents
      })),
      portfolio: p.posts.map((post) => ({
        id: post.id, caption: post.caption, image: mediaUrl(post.imageUrl) ?? post.imageUrl,
        tags: post.tags, likes: post.likes, saves: post.saves
      }))
    };
  });

  return NextResponse.json({ providers });
}
