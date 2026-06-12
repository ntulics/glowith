import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns the busy intervals for a provider on a given date so the client
// can grey out taken slots. Public (needed before booking).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerProfileId = searchParams.get("providerProfileId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  if (!providerProfileId || !date) {
    return NextResponse.json({ error: "providerProfileId and date are required" }, { status: 400 });
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);
  const now = new Date();

  // Resolve root business so blocked slots set by the parent cover agents too
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { parentBusinessId: true }
  });
  const rootProviderId = profile?.parentBusinessId ?? providerProfileId;

  const [bookings, blocked] = await Promise.all([
    prisma.booking.findMany({
      where: {
        providerProfileId,
        startsAt: { gte: dayStart, lte: dayEnd },
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING_DEPOSIT", reservedUntil: { gt: now } },
        ],
      },
      select: { startsAt: true, durationMinutes: true, service: { select: { durationMinutes: true } } }
    }),
    prisma.blockedSlot.findMany({
      where: {
        providerProfileId: rootProviderId,
        startsAt: { gte: dayStart, lte: dayEnd },
      },
      select: { startsAt: true, endsAt: true }
    })
  ]);

  const busy = [
    ...bookings.map((b) => ({
      start: b.startsAt.toISOString(),
      durationMinutes: b.durationMinutes || b.service.durationMinutes,
      blocked: false,
    })),
    ...blocked.map((s) => ({
      start: s.startsAt.toISOString(),
      durationMinutes: Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60000),
      blocked: true,
    })),
  ];
  return NextResponse.json({ busy });
}
