import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";

function shapeProvider(p: any) {
  const avg = p.ratings?.length
    ? Math.round((p.ratings.reduce((s: number, r: any) => s + r.stars, 0) / p.ratings.length) * 10) / 10
    : 5.0;
  return {
    id: p.id,
    handle: p.handle,
    name: p.businessName,
    avatarUrl: mediaUrl(p.avatarUrl),
    category: p.category,
    city: p.city,
    lat: p.latitude,
    lng: p.longitude,
    rating: avg,
    reviewCount: p.ratings?.length ?? 0,
    verified: p.verified,
    services: (p.services ?? []).map((s: any) => ({
      id: s.id, name: s.name, category: s.category,
      durationMinutes: s.durationMinutes, priceCents: s.priceCents, depositCents: s.depositCents
    }))
  };
}

const INCLUDE = {
  services: { where: { active: true }, orderBy: { createdAt: "asc" as const } },
  ratings: { select: { stars: true } }
};

// GET: return { saved: [...], followed: [...] }
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const [savedRows, followRows] = await Promise.all([
    prisma.savedProvider.findMany({
      where: { userId },
      include: { providerProfile: { include: INCLUDE } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.follow.findMany({
      where: { userId },
      include: { providerProfile: { include: INCLUDE } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return NextResponse.json({
    saved: savedRows.map((r) => shapeProvider(r.providerProfile)),
    followed: followRows.map((r) => shapeProvider(r.providerProfile))
  });
}

// POST: toggle save (save if not saved, unsave if already saved)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const { providerProfileId, action } = await request.json();

  if (action === "save") {
    const existing = await prisma.savedProvider.findUnique({ where: { userId_providerProfileId: { userId, providerProfileId } } });
    if (existing) {
      await prisma.savedProvider.delete({ where: { userId_providerProfileId: { userId, providerProfileId } } });
      return NextResponse.json({ saved: false });
    }
    await prisma.savedProvider.create({ data: { userId, providerProfileId } });
    return NextResponse.json({ saved: true });
  }

  if (action === "follow") {
    const existing = await prisma.follow.findUnique({ where: { userId_providerProfileId: { userId, providerProfileId } } });
    if (existing) {
      await prisma.follow.delete({ where: { userId_providerProfileId: { userId, providerProfileId } } });
      return NextResponse.json({ followed: false });
    }
    await prisma.follow.create({ data: { userId, providerProfileId } });
    return NextResponse.json({ followed: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
