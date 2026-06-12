import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/media";
import { isSAPublicHoliday } from "@/lib/sa-holidays";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function workingHoursForDate(json: string | null | undefined, date: Date): { open: string; close: string } | null {
  if (!json) return null;
  try {
    const hours: Array<{ day: string; enabled: boolean; from: string; to: string }> = JSON.parse(json);
    const dayName = DAY_NAMES[date.getDay()];
    const entry = hours.find((h) => h.day === dayName);
    if (!entry || !entry.enabled) return null;
    return { open: entry.from, close: entry.to };
  } catch { return null; }
}

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

  // Load provider settings to enforce inherited working hours on agents
  const providerSettings = dateStr ? await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { workingHoursJson: true, workOnPublicHolidays: true }
  }) : null;

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
    const slotDate = new Date(`${dateStr}T${slot}:00`);
    const slotStart = slotDate.getTime();
    const slotEnd = slotStart + duration * 60000;

    // Check parent provider constraints — agents inherit these
    if (providerSettings) {
      // Public holiday: if provider is closed, no agents are available
      if (providerSettings.workOnPublicHolidays === false && isSAPublicHoliday(slotDate)) {
        return NextResponse.json({ agents: [] });
      }

      // Working hours: only enforce if the provider has actually saved a schedule.
      // If workingHoursJson is null the provider hasn't configured hours yet — don't block agents.
      if (providerSettings.workingHoursJson) {
        const wh = workingHoursForDate(providerSettings.workingHoursJson, slotDate);
        if (wh === null) {
          return NextResponse.json({ agents: [] });
        }
        const openMs = new Date(`${dateStr}T${wh.open}:00`).getTime();
        const closeMs = new Date(`${dateStr}T${wh.close}:00`).getTime();
        if (slotStart < openMs || slotEnd > closeMs) {
          return NextResponse.json({ agents: [] });
        }
      }
    }

    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59`);

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
        return slotStart < be && slotEnd > bs;
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
