import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: { agents: { select: { id: true } } }
  });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const profileIds = [profile.id, ...profile.agents.map((a) => a.id)];
  const scopedProfileIds = profile.parentBusinessId ? [profile.id] : profileIds;
  const expiryThreshold = new Date(now.getTime() - 15 * 60 * 1000);
  const deleteExpiredBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  await prisma.booking.updateMany({
    where: {
      providerProfileId: { in: scopedProfileIds },
      status: "PENDING_DEPOSIT",
      createdAt: { lt: expiryThreshold }
    },
    data: { status: "EXPIRED" }
  });
  await prisma.booking.deleteMany({
    where: {
      providerProfileId: { in: scopedProfileIds },
      status: "EXPIRED",
      updatedAt: { lt: deleteExpiredBefore }
    }
  });

  const bookings = await prisma.booking.findMany({
    where: {
      providerProfileId: { in: scopedProfileIds },
      status: { in: ["CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"] },
      startsAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
    },
    include: {
      client: { select: { id: true, name: true, email: true, image: true } },
      service: {
        select: {
          name: true,
          durationMinutes: true,
          priceCents: true,
          providerProfile: { select: { id: true, businessName: true } }
        }
      }
    },
    orderBy: { startsAt: "asc" }
  });

  const activeBookings = bookings.filter((b) => b.status === "CONFIRMED");
  const todaysConfirmed = activeBookings.filter((b) => b.startsAt >= dayStart && b.startsAt <= dayEnd);
  const completedToday = bookings.filter((b) => b.status === "COMPLETED" && (b.completedAt ?? b.startsAt) >= dayStart && (b.completedAt ?? b.startsAt) <= dayEnd);
  const stats = {
    upcomingCount: activeBookings.filter((b) => b.startsAt >= now).length,
    todayCount: todaysConfirmed.length,
    expectedRevenueCents: todaysConfirmed.reduce((sum, b) => sum + (b.service?.priceCents ?? 0), 0),
    collectedRevenueCents: completedToday.reduce((sum, b) => sum + (b.service?.priceCents ?? 0), 0),
    checkedInCount: todaysConfirmed.filter((b) => b.checkedInAt).length,
    completedTodayCount: completedToday.length
  };

  return NextResponse.json({
    stats,
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      startsAt: b.startsAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      checkedInAt: b.checkedInAt?.toISOString() ?? null,
      noShowAt: b.noShowAt?.toISOString() ?? null,
      completedAt: b.completedAt?.toISOString() ?? null,
      feedbackRequestedAt: b.feedbackRequestedAt?.toISOString() ?? null,
      notes: b.notes,
      depositCents: b.depositCents,
      durationMinutes: b.service?.durationMinutes ?? b.durationMinutes,
      service: b.service?.name ?? "Service",
      agentName: b.service?.providerProfile?.id !== profile.id ? b.service?.providerProfile?.businessName ?? null : null,
      priceCents: b.service?.priceCents ?? 0,
      client: {
        id: b.client.id,
        name: b.client.name,
        email: b.client.email,
        image: b.client.image
      }
    }))
  });
}

// Provider-initiated (manual) booking — creates directly as CONFIRMED, no deposit required
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, parentBusinessId: true }
  });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  const { clientId, serviceId, startsAt, notes, extraIds = [], agentProfileId } = await request.json();
  if (!clientId || !serviceId || !startsAt) {
    return NextResponse.json({ error: "clientId, serviceId and startsAt are required" }, { status: 400 });
  }

  // Determine booking target: agent profile or business own profile
  let bookingProfileId = profile.id;
  if (agentProfileId) {
    const agent = await prisma.providerProfile.findFirst({
      where: { id: agentProfileId, parentBusinessId: profile.id }
    });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    bookingProfileId = agentProfileId;
  }

  // Service can be on the business profile or the specific agent's profile
  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerProfileId: { in: [profile.id, bookingProfileId] }, active: true }
  });
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const extras = extraIds.length
    ? await prisma.serviceExtra.findMany({ where: { id: { in: extraIds }, serviceId, active: true } })
    : [];

  const totalDuration = service.durationMinutes + extras.reduce((s: number, e: any) => s + e.durationMinutes, 0);

  const booking = await prisma.booking.create({
    data: {
      clientId,
      providerProfileId: bookingProfileId,
      serviceId,
      startsAt: new Date(startsAt),
      status: "CONFIRMED",
      depositCents: 0,
      durationMinutes: totalDuration,
      notes: notes ?? null,
      extras: extras.length
        ? { create: extras.map((e: any) => ({ serviceExtraId: e.id, name: e.name, priceCents: e.priceCents, durationMinutes: e.durationMinutes })) }
        : undefined,
    }
  });

  return NextResponse.json({ booking: { id: booking.id } }, { status: 201 });
}
