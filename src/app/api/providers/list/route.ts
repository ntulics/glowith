import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";
import { geocodeQuery } from "@/lib/geocode";

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

  const providers = await Promise.all(profiles.map(async (p) => {
    const avg = p.ratings.length
      ? Math.round((p.ratings.reduce((s, r) => s + r.stars, 0) / p.ratings.length) * 10) / 10
      : 5.0;

    // Backfill coordinates from the city when a provider hasn't set them, so it
    // can appear on the map. Cached + jittered slightly to avoid exact overlap.
    let lat = p.latitude, lng = p.longitude;
    if ((lat === 0 && lng === 0) && p.city) {
      const g = await geocodeQuery(p.city);
      if (g) {
        const jitter = () => (Math.random() - 0.5) * 0.012; // ~±0.6km
        lat = g.lat + jitter();
        lng = g.lng + jitter();
      }
    }

    return {
      id: p.id,
      handle: p.handle,
      name: p.businessName,
      businessName: p.businessName,
      category: p.category,
      rating: avg,
      reviewCount: p.ratings.length,
      distanceKm: 0,
      location: { label: p.city || "South Africa", lat, lng },
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
  }));

  return NextResponse.json({ providers });
}
