import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";
import { geocodeQuery } from "@/lib/geocode";

// "Trending" — providers ordered by most ratings + comments (engagement score).
// Falls back to most recently joined when no ratings exist.
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
      ratings: { select: { stars: true } },
      _count: { select: { ratings: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  // Score = (number of ratings * avg_star) + review_count weighting
  const scored = profiles.map((p) => {
    const count = p._count.ratings;
    const avg = count
      ? p.ratings.reduce((s, r) => s + r.stars, 0) / count
      : 0;
    return { p, score: count * avg };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 20);

  const citiesNeedingGeocode = [...new Set(
    top.filter(({ p }) => p.latitude === 0 && p.longitude === 0 && p.city).map(({ p }) => p.city!)
  )];
  const cityCoords = new Map<string, { lat: number; lng: number } | null>();
  await Promise.all(
    citiesNeedingGeocode.map(async city => {
      cityCoords.set(city, await geocodeQuery(city).catch(() => null));
    })
  );

  const providers = top.map(({ p }) => {
    const avg = p._count.ratings
      ? Math.round((p.ratings.reduce((s, r) => s + r.stars, 0) / p._count.ratings) * 10) / 10
      : 5.0;

    let lat = p.latitude, lng = p.longitude;
    if ((lat === 0 && lng === 0) && p.city) {
      const g = cityCoords.get(p.city) ?? null;
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
      reviewCount: p._count.ratings,
      distanceKm: 0,
      location: { label: p.city || "South Africa", lat, lng },
      verified: p.verified,
      nextAvailable: "Today",
      bio: p.bio,
      services: p.services.map((s) => ({
        id: s.id, name: s.name, durationMinutes: s.durationMinutes,
        priceCents: s.priceCents, depositCents: s.depositCents, depositIsPercent: s.depositIsPercent
      })),
      portfolio: p.posts.map((post) => ({
        id: post.id, caption: post.caption, image: mediaUrl(post.imageUrl) ?? post.imageUrl,
        likes: post.likes, saves: post.saves
      }))
    };
  });

  return NextResponse.json({ providers });
}
