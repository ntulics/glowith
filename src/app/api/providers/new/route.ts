import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";
import { geocodeQuery } from "@/lib/geocode";

// "New to Glowith" — most recently joined providers, no proximity filter.
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
      posts: { orderBy: { createdAt: "desc" }, take: 4 },
      ratings: { select: { stars: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const providers = await Promise.all(profiles.map(async (p) => {
    const avg = p.ratings.length
      ? Math.round((p.ratings.reduce((s, r) => s + r.stars, 0) / p.ratings.length) * 10) / 10
      : 5.0;

    let lat = p.latitude, lng = p.longitude;
    if ((lat === 0 && lng === 0) && p.city) {
      const g = await geocodeQuery(p.city);
      if (g) {
        let h = 0;
        for (let k = 0; k < p.id.length; k++) h = (h * 31 + p.id.charCodeAt(k)) | 0;
        lat = g.lat + ((h % 1000) / 1000 - 0.5) * 0.01;
        lng = g.lng + (((h >> 10) % 1000) / 1000 - 0.5) * 0.01;
      }
    }

    return {
      id: p.id,
      handle: p.handle,
      name: p.businessName,
      businessName: p.businessName,
      avatarUrl: mediaUrl(p.avatarUrl),
      category: p.category,
      rating: avg,
      reviewCount: p.ratings.length,
      distanceKm: 0,
      location: { label: p.city || "South Africa", lat, lng },
      verified: p.verified,
      nextAvailable: "Today",
      bio: p.bio,
      services: p.services.map((s) => ({
        id: s.id, name: s.name, durationMinutes: s.durationMinutes,
        priceCents: s.priceCents, depositCents: s.depositCents
      })),
      portfolio: p.posts.map((post) => ({
        id: post.id, caption: post.caption, image: mediaUrl(post.imageUrl) ?? post.imageUrl,
        likes: post.likes, saves: post.saves
      }))
    };
  }));

  return NextResponse.json({ providers });
}
