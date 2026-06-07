import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";

// Returns the staff/agents for a business provider.
// Optional: pass date=YYYY-MM-DD&slot=HH:MM&duration=N to filter out unavailable agents
// so "no preference" can be randomly assigned from available ones only.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerProfileId = searchParams.get("providerProfileId");
  if (!providerProfileId) return NextResponse.json({ agents: [] });

  const dateStr = searchParams.get("date");   // YYYY-MM-DD
  const slot = searchParams.get("slot");       // HH:MM
  const duration = parseInt(searchParams.get("duration") ?? "60", 10);

  const agents = await prisma.providerProfile.findMany({
    where: { parentBusinessId: providerProfileId },
    select: {
      id: true,
      handle: true,
      businessName: true,
      avatarUrl: true,
      category: true,
      services: { where: { active: true }, select: { category: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  // If availability check requested, filter out agents with conflicting bookings
  let available = agents;
  if (dateStr && slot) {
    const [h, m] = slot.split(":").map(Number);
    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59`);
    const slotStart = new Date(`${dateStr}T${slot}:00`);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    const busyData = await prisma.booking.findMany({
      where: {
        providerProfileId: { in: agents.map((a) => a.id) },
        status: "CONFIRMED",
        startsAt: { gte: dayStart, lte: dayEnd }
      },
      select: { providerProfileId: true, startsAt: true, durationMinutes: true, service: { select: { durationMinutes: true } } }
    });

    const busyByAgent = new Map<string, typeof busyData>();
    for (const b of busyData) {
      if (!busyByAgent.has(b.providerProfileId)) busyByAgent.set(b.providerProfileId, []);
      busyByAgent.get(b.providerProfileId)!.push(b);
    }

    available = agents.filter((a) => {
      const busy = busyByAgent.get(a.id) ?? [];
      return !busy.some((b) => {
        const bs = b.startsAt.getTime();
        const be = bs + (b.durationMinutes || b.service.durationMinutes) * 60000;
        return slotStart.getTime() < be && slotEnd.getTime() > bs;
      });
    });
  }

  return NextResponse.json({
    agents: available.map((a) => ({
      id: a.id,
      handle: a.handle,
      name: a.businessName,
      avatarUrl: mediaUrl(a.avatarUrl),
      category: a.category,
      serviceCategories: [...new Set(a.services.map((s) => s.category).filter(Boolean))]
    }))
  });
}
