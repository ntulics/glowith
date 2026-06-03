import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Aggregate rating + recent reviews + the current user's own rating.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerProfileId = searchParams.get("providerProfileId");
  if (!providerProfileId) return NextResponse.json({ error: "providerProfileId required" }, { status: 400 });

  const session = await auth();
  const user = session?.user as any;

  const [agg, reviews, mine] = await Promise.all([
    prisma.rating.aggregate({ where: { providerProfileId }, _avg: { stars: true }, _count: true }),
    prisma.rating.findMany({
      where: { providerProfileId, comment: { not: null } },
      orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, stars: true, comment: true, createdAt: true, user: { select: { name: true } } }
    }),
    user ? prisma.rating.findUnique({ where: { userId_providerProfileId: { userId: user.id, providerProfileId } } }) : null
  ]);

  return NextResponse.json({
    avg: agg._avg.stars ?? null,
    count: agg._count,
    reviews: reviews.map((r) => ({ id: r.id, stars: r.stars, comment: r.comment, name: r.user.name, createdAt: r.createdAt.toISOString() })),
    mine: mine ? { stars: mine.stars, comment: mine.comment } : null
  });
}

// Create/update a rating. For an agent, optionally also rate the company
// (possibly with a different star value).
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Please sign in to leave a rating" }, { status: 401 });

  const { providerProfileId, stars, comment, alsoRateBusiness, businessStars } = await request.json();
  if (!providerProfileId || !stars || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Pick a rating from 1 to 5 stars" }, { status: 400 });
  }

  const target = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { id: true, parentBusinessId: true }
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clean = (comment ?? "").toString().slice(0, 500) || null;
  await prisma.rating.upsert({
    where: { userId_providerProfileId: { userId: user.id, providerProfileId } },
    update: { stars, comment: clean },
    create: { userId: user.id, providerProfileId, stars, comment: clean }
  });

  // Propagate to the company if the user opted in
  if (target.parentBusinessId && alsoRateBusiness) {
    const bStars = businessStars && businessStars >= 1 && businessStars <= 5 ? businessStars : stars;
    await prisma.rating.upsert({
      where: { userId_providerProfileId: { userId: user.id, providerProfileId: target.parentBusinessId } },
      update: { stars: bStars },
      create: { userId: user.id, providerProfileId: target.parentBusinessId, stars: bStars }
    });
  }

  return NextResponse.json({ ok: true });
}
