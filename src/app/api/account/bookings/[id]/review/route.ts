import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/account/bookings/:id/review
// Body: { providerStars, providerComment, agentStars?, agentComment? }
// Only allowed on COMPLETED bookings belonging to the authenticated user.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      providerProfile: { select: { id: true, parentBusinessId: true } }
    }
  });

  if (!booking || booking.clientId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "Reviews are only for completed bookings" }, { status: 400 });
  }

  const { providerStars, providerComment, agentStars, agentComment } = await request.json();

  if (!providerStars || providerStars < 1 || providerStars > 5) {
    return NextResponse.json({ error: "providerStars must be 1–5" }, { status: 400 });
  }

  const clean = (s?: string) => (s ?? "").toString().trim().slice(0, 500) || null;

  const isAgentBooking = !!booking.providerProfile.parentBusinessId;
  const rootProviderId = booking.providerProfile.parentBusinessId ?? booking.providerProfile.id;
  const agentProfileId = isAgentBooking ? booking.providerProfile.id : null;

  // Upsert provider rating
  await prisma.rating.upsert({
    where: { userId_providerProfileId: { userId: user.id, providerProfileId: rootProviderId } },
    update: { stars: providerStars, comment: clean(providerComment) },
    create: { userId: user.id, providerProfileId: rootProviderId, stars: providerStars, comment: clean(providerComment) }
  });

  // Upsert agent rating if provided
  if (agentProfileId && agentStars && agentStars >= 1 && agentStars <= 5) {
    await prisma.rating.upsert({
      where: { userId_providerProfileId: { userId: user.id, providerProfileId: agentProfileId } },
      update: { stars: agentStars, comment: clean(agentComment) },
      create: { userId: user.id, providerProfileId: agentProfileId, stars: agentStars, comment: clean(agentComment) }
    });
  }

  return NextResponse.json({ ok: true });
}

// GET /api/account/bookings/:id/review — check if already reviewed
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      providerProfile: { select: { id: true, parentBusinessId: true } }
    }
  });

  if (!booking || booking.clientId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAgentBooking = !!booking.providerProfile.parentBusinessId;
  const rootProviderId = booking.providerProfile.parentBusinessId ?? booking.providerProfile.id;
  const agentProfileId = isAgentBooking ? booking.providerProfile.id : null;

  const [providerRating, agentRating] = await Promise.all([
    prisma.rating.findUnique({
      where: { userId_providerProfileId: { userId: user.id, providerProfileId: rootProviderId } }
    }),
    agentProfileId
      ? prisma.rating.findUnique({
          where: { userId_providerProfileId: { userId: user.id, providerProfileId: agentProfileId } }
        })
      : Promise.resolve(null)
  ]);

  return NextResponse.json({
    reviewed: !!providerRating,
    provider: providerRating ? { stars: providerRating.stars, comment: providerRating.comment } : null,
    agent: agentRating ? { stars: agentRating.stars, comment: agentRating.comment } : null
  });
}
