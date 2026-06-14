import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";

// Returns agents available for a specific slot (authenticated — for provider dashboard use)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");    // YYYY-MM-DD
  const slot = searchParams.get("slot");    // HH:MM
  const duration = parseInt(searchParams.get("duration") ?? "60", 10);
  const serviceId = searchParams.get("serviceId");

  if (!date || !slot) return NextResponse.json({ error: "date and slot required" }, { status: 400 });

  const slotStart = new Date(`${date}T${slot}:00`).getTime();
  const slotEnd = slotStart + duration * 60000;

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  // Fetch agents belonging to this business (filter by service if provided)
  const agents = await prisma.providerProfile.findMany({
    where: {
      parentBusinessId: profile.id,
      ...(serviceId ? { services: { some: { id: serviceId, active: true } } } : {})
    },
    select: { id: true, businessName: true, avatarUrl: true }
  });

  if (agents.length === 0) return NextResponse.json({ agents: [] });

  const agentIds = agents.map((a) => a.id);

  // Check bookings and blocks for the slot
  const [agentBookings, agentBlocked] = await Promise.all([
    prisma.booking.findMany({
      where: { providerProfileId: { in: agentIds }, status: "CONFIRMED", startsAt: { gte: dayStart, lte: dayEnd } },
      select: { providerProfileId: true, startsAt: true, durationMinutes: true, service: { select: { durationMinutes: true } } }
    }),
    prisma.blockedSlot.findMany({
      where: { providerProfileId: { in: agentIds }, startsAt: { gte: dayStart, lte: dayEnd } },
      select: { providerProfileId: true, startsAt: true, endsAt: true }
    })
  ]);

  const available = agents.filter((a) => {
    const bookingConflict = agentBookings
      .filter((b) => b.providerProfileId === a.id)
      .some((b) => {
        const bs = b.startsAt.getTime();
        const be = bs + (b.durationMinutes || b.service.durationMinutes) * 60000;
        return slotStart < be && slotEnd > bs;
      });
    const blockConflict = agentBlocked
      .filter((b) => b.providerProfileId === a.id)
      .some((b) => slotStart < b.endsAt.getTime() && slotEnd > b.startsAt.getTime());
    return !bookingConflict && !blockConflict;
  });

  return NextResponse.json({
    agents: available.map((a) => ({
      id: a.id,
      name: a.businessName,
      avatarUrl: mediaUrl(a.avatarUrl) ?? null
    }))
  });
}
