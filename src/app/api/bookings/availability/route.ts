import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSAPublicHoliday } from "@/lib/sa-holidays";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseWorkingHours(json: string | null | undefined, date: Date): { open: string; close: string } | null {
  if (!json) return null;
  try {
    const hours: Array<{ day: string; enabled: boolean; from: string; to: string }> = JSON.parse(json);
    const dayName = DAY_NAMES[date.getDay()];
    const entry = hours.find((h) => h.day === dayName);
    if (!entry || !entry.enabled) return null;
    return { open: entry.from, close: entry.to };
  } catch { return null; }
}

// Returns the busy intervals for a provider on a given date so the client
// can grey out taken slots. Public (needed before booking).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerProfileId = searchParams.get("providerProfileId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const serviceId = searchParams.get("serviceId"); // optional — used for BUSINESS agent filtering
  if (!providerProfileId || !date) {
    return NextResponse.json({ error: "providerProfileId and date are required" }, { status: 400 });
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);
  const now = new Date();
  const requestDate = new Date(`${date}T12:00:00`);

  // Resolve root business so blocked slots and settings from the parent apply to agents too
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { parentBusinessId: true, workOnPublicHolidays: true, providerType: true }
  });
  const rootProviderId = profile?.parentBusinessId ?? providerProfileId;
  const isBusiness = profile?.providerType === "BUSINESS" && !profile?.parentBusinessId;

  // Load root provider settings
  const rootProfile = await prisma.providerProfile.findUnique({
    where: { id: rootProviderId },
    select: {
      workingHoursJson: true,
      workOnPublicHolidays: true,
      providerType: true,
      agents: { select: { id: true, services: { where: { active: true }, select: { id: true } } } }
    }
  });

  // Public holiday check
  if (rootProfile?.workOnPublicHolidays === false && isSAPublicHoliday(requestDate)) {
    return NextResponse.json({
      busy: [{ start: `${date}T00:00:00.000Z`, durationMinutes: 1440, blocked: true, publicHoliday: true }],
      workingHours: null,
    });
  }

  const workingHours = parseWorkingHours(rootProfile?.workingHoursJson, requestDate);

  // ── BUSINESS provider: availability depends on agents ──────────────────────
  if (isBusiness && rootProfile?.agents.length) {
    // Filter agents by service if serviceId provided
    const agents = serviceId
      ? rootProfile.agents.filter((a) => a.services.some((s) => s.id === serviceId))
      : rootProfile.agents;

    if (agents.length === 0) {
      // No agents offer this service → fully booked all day
      return NextResponse.json({
        busy: [{ start: `${date}T00:00:00.000Z`, durationMinutes: 1440, blocked: true }],
        workingHours,
      });
    }

    const agentIds = agents.map((a) => a.id);

    // Load bookings for all agents on this day
    const agentBookings = await prisma.booking.findMany({
      where: {
        providerProfileId: { in: agentIds },
        startsAt: { gte: dayStart, lte: dayEnd },
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING_DEPOSIT", reservedUntil: { gt: now } },
        ],
      },
      select: { providerProfileId: true, startsAt: true, durationMinutes: true, service: { select: { durationMinutes: true } } }
    });

    // Load blocked slots for all agents
    const agentBlocked = await prisma.blockedSlot.findMany({
      where: { providerProfileId: { in: [rootProviderId, ...agentIds] }, startsAt: { gte: dayStart, lte: dayEnd } },
      select: { providerProfileId: true, startsAt: true, endsAt: true }
    });

    // For a slot to be "busy" for the business, ALL agents must be unavailable.
    // We build busy intervals per agent, then find intervals where ALL agents are blocked.
    type Interval = { start: number; end: number };
    const busyByAgent = new Map<string, Interval[]>();
    for (const id of agentIds) busyByAgent.set(id, []);

    for (const b of agentBookings) {
      const dur = b.durationMinutes || b.service.durationMinutes;
      const s = b.startsAt.getTime();
      busyByAgent.get(b.providerProfileId)?.push({ start: s, end: s + dur * 60000 });
    }
    // Business-level blocks apply to ALL agents
    const businessBlocked = agentBlocked.filter((s) => s.providerProfileId === rootProviderId);
    // Agent-specific blocks apply only to that agent
    for (const s of agentBlocked) {
      const dur = s.endsAt.getTime() - s.startsAt.getTime();
      if (s.providerProfileId === rootProviderId) {
        // Apply to all agents
        for (const id of agentIds) {
          busyByAgent.get(id)?.push({ start: s.startsAt.getTime(), end: s.endsAt.getTime() });
        }
      } else {
        busyByAgent.get(s.providerProfileId)?.push({ start: s.startsAt.getTime(), end: s.endsAt.getTime() });
      }
    }

    // Find 30-min slots within working hours where ALL agents are busy
    if (!workingHours) {
      // If no working hours config, return no busy intervals (provider hasn't set up schedule)
      return NextResponse.json({ busy: [], workingHours: null });
    }
    const openMs = new Date(`${date}T${workingHours.open}:00`).getTime();
    const closeMs = new Date(`${date}T${workingHours.close}:00`).getTime();

    const fullyBlockedIntervals: Array<{ start: string; durationMinutes: number; blocked: boolean }> = [];
    const SLOT = 30 * 60000; // 30-min resolution
    let slotStart = openMs;
    while (slotStart < closeMs) {
      const slotEnd = slotStart + SLOT;
      // Is every agent busy for this slot?
      const allBusy = agentIds.every((id) => {
        return (busyByAgent.get(id) ?? []).some((b) => b.start < slotEnd && b.end > slotStart);
      });
      if (allBusy) {
        fullyBlockedIntervals.push({
          start: new Date(slotStart).toISOString(),
          durationMinutes: 30,
          blocked: false,
        });
      }
      slotStart = slotEnd;
    }

    return NextResponse.json({ busy: fullyBlockedIntervals, workingHours });
  }

  // ── FREELANCER / AGENT: own bookings ──────────────────────────────────────
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
  return NextResponse.json({ busy, workingHours });
}
