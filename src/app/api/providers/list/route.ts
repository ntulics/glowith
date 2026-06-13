import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";
import { geocodeQuery } from "@/lib/geocode";

// Public marketplace list — real DB providers (businesses & standalone freelancers)
// that have at least one active service and one portfolio photo, shaped for the cards.
// When called from the freelancer subdomain (x-tenant-slug: freelancer), only FREELANCER type is returned.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const tenantSlug = request.headers.get("x-tenant-slug");
  const freelancerOnly = typeParam === "freelancer" || tenantSlug === "freelancer";
  const providerTypeFilter = freelancerOnly
    ? ({ in: ["FREELANCER"] } as any)
    : ({ in: ["BUSINESS", "FREELANCER"] } as any);

  const profiles = await prisma.providerProfile.findMany({
    where: {
      providerType: providerTypeFilter,
      parentBusinessId: null,
      services: { some: { active: true } },
    },
    include: {
      services: { where: { active: true }, orderBy: { createdAt: "asc" }, include: { extras: { where: { active: true } } } },
      posts: { orderBy: { createdAt: "desc" }, take: 6 },
      ratings: { select: { stars: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 60
  });

  // Geocode unique cities once (not per-provider) to avoid rate-limiting Nominatim
  // on cold-start when many providers share the same city.
  const citiesNeedingGeocode = [...new Set(
    profiles.filter(p => p.latitude === 0 && p.longitude === 0 && p.city).map(p => p.city!)
  )];
  const cityCoords = new Map<string, { lat: number; lng: number } | null>();
  await Promise.all(
    citiesNeedingGeocode.map(async city => {
      const g = await geocodeQuery(city).catch(() => null);
      cityCoords.set(city, g);
    })
  );

  const providers = profiles.map((p) => {
    const avg = p.ratings.length
      ? Math.round((p.ratings.reduce((s, r) => s + r.stars, 0) / p.ratings.length) * 10) / 10
      : 5.0;

    let lat = p.latitude, lng = p.longitude;
    if ((lat === 0 && lng === 0) && p.city) {
      const g = cityCoords.get(p.city) ?? null;
      if (g) {
        let h = 0;
        for (let k = 0; k < p.id.length; k++) h = (h * 31 + p.id.charCodeAt(k)) | 0;
        const offLat = ((h % 1000) / 1000 - 0.5) * 0.01;
        const offLng = (((h >> 10) % 1000) / 1000 - 0.5) * 0.01;
        lat = g.lat + offLat;
        lng = g.lng + offLng;
      }
    }

    return {
      id: p.id,
      handle: p.handle,
      name: p.businessName,
      businessName: p.businessName,
      avatarUrl: mediaUrl(p.avatarUrl),
      category: p.category,
      providerType: p.providerType,
      parentBusinessName: null,
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
        durationMinutes: s.durationMinutes, priceCents: s.priceCents, depositCents: s.depositCents, depositIsPercent: s.depositIsPercent,
        extras: (s as any).extras?.map((e: any) => ({ id: e.id, name: e.name, description: e.description, priceCents: e.priceCents, durationMinutes: e.durationMinutes })) ?? []
      })),
      portfolio: p.posts.map((post) => ({
        id: post.id, caption: post.caption, image: mediaUrl(post.imageUrl) ?? post.imageUrl,
        tags: post.tags, likes: post.likes, saves: post.saves
      }))
    };
  });

  return NextResponse.json({ providers });
}
